---
title: Chunk Aware S3 Extension API
author: Caitlin Bestler
---
Amazon's S3 API is the primary API used to access object storage services. However it has a blind spot that makes it suboptimal for any object storage system which stores objects in chunks, particularly if the chunks are variable-sized or updated as copy-on-write data.

Any object storage solution that stores objects as copy-on-write chunks should also support distributed deduplication and some form of snapshotting.

If you didn't already know I am sure you can guess from this that NexentaEdge stores objects as variably sized chunks with global deduplication. NexentaEdge is optimized for storing multiple versions of the same objects. This increases deduplication, but also makes API support for 'editing' an object to create a new object version important.

Variable chunking allows application specific optimization of how an object is broken up into chunks. This can increase the probability of retaining prior chunks in a new object version, or even of finding common chunks between different objects.

But without extensions the S3 API provides no ability for the application to hint at what optimal chunking would be.

Global deduplication is supposed to identify common chunks and avoid the costs of redundantly storing and transmitting the redundant payload.

But without extension the S3 API will transmit every byte each time duplicate content is submitted.

Most Object Storage solutions offer various methods of compressing objects or chunks to save both storage and network resources.

But again, the S3 API only enables compression to be done after the object has been fully transmitted using the S3 API.

Copy-on-write chunks enable object cloning and snapshotting sets of objects without requiring any payload to be copied. Different storage systems will vary on exactly how this is done, but being to create a snapshot without having to stop the world while copying vast amounts of payload will always be useful.

But the base S3 API provides no support for creating or using snapshots.

This document proposes a set extensions to the S3 API to address these limitations. These are strict extensions: additional methods and additional metadata parameters. All of the already defined S3 commands are left as is.

## Common Deployment
Application developers are never quick to rely upon new APIs, even extensions to APIs.

Development of the API proposed here was driven to support an S3 Proxy Container that could be co-deployed with the Client code and optimize the wire traffic between the client host and a NexentaEdge cluster.

This deployment model raises specific concerns about how to fully enable NexentaEdge features without exposing NexentaEdge internals in ways that compromised data security or limited potential future upgrades to NexentaEdge.

How those concerns shaped this "internal" API turn out to make a good technology neutral API for any Object Storage solution that uses Chunks to store portions of the object payload and metadata.  

The Chunk-Aware Object API addresses these issues. It is anticipated that this API will mostly be deployed between Containers that are co-deployed with client code, but the API can.

Making the chunk-aware API public serves a few purposes:
* This API is offered to the object storage community at large. We believe that it neutral as to the internal organization of how any given solution stores objects. Only a technology neutral API will ever be able to attract the interest of application developers that could benefit from an optimized interface that more accurately encodes what has changed between object versions.

## Hiding the Manifests
This API should support all object storage which stores payload in copy-on-write chunks. This assumes that there is additional storage that describes object versions. NexentaEdge calls these "Version Manifests". Others may refer to them as inodes or other names. The goal of the API is to hide all informatoin about how a specific storage vendor implements Manifests.

### NexentaEdge Payload Access Control
Exposing NexentaEdge internals was not really an option for security reasons. NexentaEdge defines object versions in special chunks called "Version Manifests". Version Manifests reference sub-manifests (Content Manifests) and Payload Chunks.

Working inside of a secure perimeter we are able to limit Access Control List checking to operations on the Version Manifest. NexentaEdge chunk references incorporate a very large Chunk Identifier ("CHID"), either 256 or 512 identifying bits. We don't bother rechecking authorization because anyone asking for that **exact** CHID obviously got it from a Version Manifest, which we did check.

While "security-through-extremely-sparse-namespace" might not sound like a great security strategy it actually is. It is also how the system administrator's password is protected, hopefully. Even if your system administrator is willing to memorize 128 bits of password that is less protection that a 256 or 512 chunk identifier provides.

But as soon as actual Chunk Identifiers are transmitted outside of the secure perimeter that protection is lost. Therefore, the API needs to be able to reference chunks without having to explicitly identify them. The client can use a cryptographic hash identifier to test whether a chunk is already stored

In designing an API that could be deployed to components outside of a secure perimeter that security is lost. The API has to avoid explicitly representing the contents of a Version Manifest.

Abstracting the Manifest also means that the application does not have to deal with a lot of issues that should be internal to the storage product. Is the Manifest itself broken up into Chunks? One way or another for large objects the answer is undoubtedly yes. But how? If you have 4 vendors you probably have 6 solutions.

### Abstract Manifest
An Abstract Manifest is an abstraction for a vendor specific storage item which encodes a version of any object. This encoding includes:
* One or more key-value metadata pairs. Vendors may require certain metadata entries be created.
* Zero or more non-overlapping chunk references.

The API defines a Chunk Reference as follows:
  * Logical offset
  * Logical length
  * A reference to the Chunk payload, which may be:
    * inline.
    * An opaque reference to the chunk. This opaque reference can be used to both retrieve the chunk payload and validate the retrieved payload.

This reference is defined to be immutable. Routine replication of the referenced payload cannot require updating the references to it. This requires some form of indirection to locate the payload. In NexentaEdge the chunk references the cryptographic hash of the chunk payload to dictate a group of target servers that are responsible for storing the chunk. The group can be queried to locate the chunk. It would be equally valid to maintain the location as metadata as long as that metadata can be looked up from the chunk reference.

This API does not define how a Manifest is encoded or stored. The user creates a manifest implicitly by editing the pending object version. This pending object version is not visible to other users until it is explicitly committed. A pending object version inherits the contents of the prior version.

The API does require that each Manifest have a unique immutable Manifest-Token which can be used to retrieve the Manifest and to validate that its contents have not been corrupted.
NexentaEdge implements a Manifest-Token as the cryptographic hash of the payload of the Version Manifest chunk.

## Editing Objects
Users edit objects by creating a new pending object, applying edits to the pending object and then committing the pending object.

Edits made to a pending object are not visible to any other user until the commit. If the session performing the transaction is terminated the pending object version is aborted and all changed discarded. The user may also explicitly abort a pending object version.

A transaction consists of:
* A **"new"** command to create the new object version. This command specifies the base version and the editing mode.
* Zero or more edits.
* A transaction ending command: **"commit"** or **"abort"**
Typical edits supply the new payload at a Logical Offset and length. This data may be optionally pre-compressed.
Additionally, edits may be made to the key-value metadata for the pending object version.

## Fork-edit-merge
As an option a 'new' command could create a snapshot version to hold multiple version manifests created within the transaction. This is the equivalent of creating a fork under git.

The edits are then applied to the fork, and eventually merged or abandoned.

## Deduplication Probe
When supplying new payload the client can optionally pre-fingerprint the payload and initially submit just the fingerprint rather than the actual payload. The response will either specify that the payload is already stored (and no upload is required) or that the payload may now be uploaded.

## Pre-compressing Payload
Payload may optionally be pre-compressed for all chunks in an object. This is enabled with a *TBD* metadata key associated with the pending object version. The value can encodes the compression algorithm used. It is assumed that the clients will recognize the value and be able to apply the inverse decompression algorithm.

When using pre-compressed chunks the client must provide both the logical and compressed length of each chunk.

# Validation of Stored Object versions
Copy-on-write chunks are not modified on the fly. Many storage clusters will go further and make the chunks immutable: created once, replicated as many times as needed and perhaps eventually deleted but **never** updated.

Once you have immutable chunks it is possible to define services that allow the user to verify that objects are still stored without corruption, without requiring the user to keep their own redundant copies of the data or even to consume network bandwidth transferring  the object in order to validate it.

Each object version is rooted by a Version Manifest. It has a cryptographic hash of its content. That includes the CHIDs of all the referenced sub-manifests ad raw payload manifests. If the VM-CHID is valid, and each referenced chunk is valid then the object is intact in the cluster.

The VM-CHID of an object version ca be used as a testable token to validate

The same is true of any Snapshot Manifest, although it's references are to Snapshot Manifests.

The API enables retrieval and comparison against an opaque "token" string that will detect any alteration of the storage without having to retain the storage itself.

Data can also be scrubbed, triggering data recovery when any of the snapshot data has been corrupted or lost without fetching content over the network.

# Snapshots
Object Storage solutions with copy-on-write payload chunks typically supports some form of snapshot where new metadata is created to reference the existing payload, preserving it independent of any new object versions being created.

In single server local file systems this can be as simple as preserving the root of a copy-on-write file system. Distributed Object Storage systems will differ in how they identify a snapshot and in how close to being a point-in-time snapshot they are. The formats of snapshots are as varied as that of the Manifests that are being referenced.

The API takes a similar approach: the composition and use of snapshots is abstracted. That actual content of a snapshot version is not exposed.

A transaction can create a new version of a snapshot. The individual edits can either add or drop a set of object versions to the pending snapshot. The pending snapshot can be committed or aborted.

The 'records' of a snapshot specify:
* A wildcard mask of a tenant-scoped name. the tenant is implicit from the session login. Cross-tenant snapshots cannot be created.
* The snapshot time. Only object versions current as of this time will be included.
* Zero or more Metadata qualifiers. Only object versions that match all Metadata Qualifiers will be included. *Note: we could make this feature optional, although any implementation can do this, even if their implementation would be sub-optimal*.

# Summary
This API would enable remote access to an Object Storage cluster without requiring knowledge of how Manifests or Snapshosts are formatted, or any informatio that would be disclosed in those formats such as the exact location of any data.

Further the API enables creating new versions as modifications of existing versions so that retained data does not have to be resubmitted. Any required read-modify-write cycles are limited to much shorter distances. The user does not have to control the read-modify-write operation, nor be concerned with its exact scope.

Being chunk aware enabled user compression/decompression, user control of chunk boundaries to improve deduplication efficiency and avoids any transmission of duplicate chunks.

Users will be able to validate stored content without having to keep their own redundant copies of the data or reading the content to be validated.

These changes enable more efficient client operations whie increasing independence from the dewsign decisons of the specific object storage cluster in use.






## Leftovers still to be merged



## Read Deduplication Hit
* Do we allow for dedup hits on read?
* Possible method; Allow description of object via a manifest with session-dependent CHIDs.
* Would enough clients cache chunks to make this code worth debugging and retesting?
.


## Single Command Transactions
* The API may support one-shot command which combine common new/edit/commit commands into a single command.

## Session Context
This API assumes that several attributes are kept for each active session:
* A User, which will have been authenticated with the tenant specified Authentication Service.
* A 'curret directory': which is inserted in the fully qaulified name after the Tenant and before the supplied name.
* Zero or one pending object versions. *To be discussed: do we allow multi-object pending sets?*

* Metching reference versions. *To be discussed, do we allow multiple reference versions for each pending version.*
