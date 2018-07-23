---
title: Chunk Aware S3 Extension API
author: Caitlin Bestler
---
In the prior blog we covered why an object storage API needs to be chunk-aware to properly support deduplication of versioned objects. In this blog we'll discuss the design of such an API, and in particular the balancing act between being aware of chunks versus not becoming intricately entangled in product specific details on how metadata is structured.

The history of this development did not start with the objective of proposing an extension to the S3 API. Application developers are never quick to rely upon new APIs, even clean extensions to existing APIs. This is why the current proposed chunk aware API was not originally intended to be a public API.

The internal goal was  to support an S3 Proxy Container that could be co-deployed using Kubernetes or Docker on or near the host machine the Client code was running on. Such a container could offer as-is support to the client while optimizing wire traffic between the client host and a NexentaEdge cluster. The client to S3-entry point bandwidth would still be wasteful, but that would all be virtual network bandwidth. No extra wire bandwidth would be consumed.

But placing a client outside the cluster makes it difficult  to fully enable NexentaEdge features without exposing internals in ways that compromise data security and/or limiting potential future upgrades.

How those concerns shaped this "internal" API turn out to make a good technology neutral API for any Object Storage solution. At least any solution that uses Chunks to store portions of the object payload and metadata.  The API would have to refer to chunks without using the actual Chunk identifiers, at least when the client would not have been aware of them anyway.

The proposed API enables chunk aware features without exposing the internals of how manifests are structured. This makes the API both simpler and more secure. It is anticipated that it will mostly be deployed between Containers that are co-deployed with client code, but the API can also be used by any client.

## Hiding the Metadata
An object version is more than the chunks holding its payload. There has to be metadata describing how to put the chunks together. S3 allows further metadata to be specified about any object.

The Chunk Aware API is designed so that the end user does not need to understand how any specific storage vendor organizes its metadata.

Vendor neutrality is of course a noble goal in API design that should be supported whenever a new API is designed. But we had another reason for not exposing the structure of our metadata. Most of the metadata is references to Chunk Identifiers (CHIDs). Exposing CHIDs of objects put by other users raises some security issues.

Exposing the object version metadata would require exporting Chunk Identifiers outside the scope of provider control. This is bad for security reasons.

Working inside of a secure perimeter we are able to limit Access Control List checking to operations on the Version Manifest. NexentaEdge chunk references incorporate a very large Chunk Identifier ("CHID"), either 256 or 512 identifying bits. NexentaEdge doesn't recheck access authorization on each chunk because anyone asking for that **exact** CHID obviously got the CHID by fingerprinting it themselves or from a Version Manifest, which we did check.

While "security-through-extremely-sparse-namespace" might not sound like a great security strategy it actually is. It is also how the system administrator's password is protected, hopefully. Even if your system administrator is willing to memorize 128 bits of password that is less protection that a 256 or 512 chunk identifier provides. Given slightly more 6 bits per printable character a password have to be over 20 characters long, which is far more than most people can memorize.

But as soon as actual Chunk Identifiers are transmitted outside of the secure perimeter that protection is lost. Yes, probing for existing chunks also exposes the CHIDS, but one at a time. A manifest exposes large sets of them in a single packet. Worse, client implementations of the API would inevitably cache the Version Manifests delivered. This would be a very tempting trove for an attacker.

Therefore, the API needs to be able to reference chunks without having to explicitly identify them. The client can use a cryptographic hash identifier to test whether a chunk is already stored

In designing an API that could be deployed to components outside of a secure perimeter that security is lost. The API has to avoid explicitly representing the contents of a Version Manifest.

Abstracting the Manifest also means that the application does not have to deal with a lot of issues that should be internal to the storage product. Is the Manifest itself broken up into Chunks? One way or another for large objects the answer is undoubtedly yes. But how? If you have 4 vendors you probably have 6 solutions.

### Abstracting the Version Manifest
The vendor neutral definition of a manifest used in the API includes:
* One or more key-value metadata pairs. Vendors may require certain metadata entries be created.
* Zero or more non-overlapping chunk references.

A Chunk Reference is defined as follows:
  * Logical offset of the uncompressed payload in the object.
  * Logical length of the uncompressed payload in the object.
  * A reference to the Chunk payload, which may be:
    * inline.
    * An opaque reference to the chunk. This opaque reference can be used to both retrieve the chunk payload and validate the retrieved payload.

This reference is defined to be immutable. Routine replication of the referenced payload cannot require updating the references to it. This requires some form of indirection to locate the payload. In NexentaEdge the chunk references the cryptographic hash of the chunk payload to dictate a group of target servers that are responsible for storing the chunk. The group can be queried to locate the chunk. It would be equally valid to maintain the location as metadata as long as that metadata can be looked up from the chunk reference.

This API does not define how a Manifest is encoded or stored. The user creates a manifest implicitly by editing the pending object version. This pending object version is not visible to other users until it is explicitly committed. A pending object version inherits the contents of the prior version.

The API does require that each Manifest have a unique immutable Manifest-Token which can be used to retrieve the Manifest and to validate that its contents have not been corrupted.

NexentaEdge implements a Manifest-Token as the cryptographic hash of the payload of the Version Manifest chunk.

## Getting Objects
The S3 API already supports ranged gets. This already translates to fetching only the specific chunks required. No further optimization of the API is needed. Applications do not need to explicitly request chunks using their Chunk IDs.

## Editing Objects
Users edit objects by creating a new pending object, applying edits to the pending object and then committing the pending object. As with Getting objects, there are no explicit maniupulation of chunk references. However, chunk identifiers (CHIDS) are used to probe for duplicate chunks.

First, having "pending" objects requires a concept of an editing session. The TCP connection is automatically associated with the ongoing session, which owns the "pending" objects. Loss of the connection will abort the session and flush any incomplete work.

To enable specifying edits that are more complex than simple appends a single put can be spread over multiple commands. However this remains a single operation that is considered to take place when the transaction is completed, not when each portion of it is specified.

Edits are made to a pending object which is not visible to any other user until the commit. If the session performing the transaction is terminated the pending object version is aborted and all changed discarded. The user may also explicitly abort a pending object version.

A transaction consists of:
* A **"new"** command to create the new object version. This command specifies the base version and the editing mode: new content, append content, or random write of new content over retained content.
* Zero or more edits.
* A transaction ending command: **"commit"** or **"abort"**
Typical edits supply the new payload at a Logical Offset and length. This data may be optionally pre-compressed.
Additionally, edits may be made to the key-value metadata for the pending object version.

## Metadata Impact on Payload
Certain metadata fields have impact on the retained payload:
* The Logical Size of an object will cause payload past the logical end to be removed from the new manifest. This may require a read-modify-write cycle for a partially retained chunk.
* Changing the compression method is not supported with retained payload. It would require fetching, decompressing and recompressing each chunk.

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

The VM-CHID of an object version can be used as a testable token to validate.

The same is true of any Snapshot Manifest, although it's references are to Snapshot Manifests.

Tests can also be made as to whether the payload of an object is unmodified even if its metadata has been altered. This can be useful for video archives where metadata can be added to historic footage, but it is still important to attest that the video footage itself has not been altered.

The API enables retrieval and comparison against an opaque "token" string that will detect any alteration of the storage without having to retain the storage itself.

Data can also be scrubbed, triggering data recovery when any of the snapshot data has been corrupted or lost without fetching content over the network.

## Replication-controls Are Not True Object Version Metadata
NexentaEdge accepts certain "metadata" fields which can control replication of an object version. Despite their API presentation these fields are not considered to be true metadata of the object version. Updates to these fields are not stored in the Version Manifests, but rather in associated data strucutres. They do not modify the CHID of the Version Manifest. This is normally totally transparent to clients. It is only relevant when a client fingerprinted the object before putting it, the client then explicitly modified the effective replication count. If the client attempts to recalculate the fingerprint of the retrieved object it must exclude the effective replication count from that calculation even though the API presents it as though it were a normal metadata field.

# Snapshots
Object Storage solutions with copy-on-write payload chunks typically supports some form of snapshot where new metadata is created to reference the existing payload, preserving it independent of any new object versions being created.

In single server local file systems this can be as simple as preserving the root of a copy-on-write file system. Distributed Object Storage systems will differ in how they identify a snapshot and in how close to being a point-in-time snapshot they are. The formats of snapshots are as varied as that of the Manifests that are being referenced.

The API takes a similar approach: the composition and use of snapshots is abstracted. That actual content of a snapshot version is not exposed.

A transaction can create a new version of a snapshot. The individual edits can either add or drop a set of object versions to the pending snapshot. The pending snapshot can be committed or aborted.

The 'records' of a snapshot specify:
* A wildcard mask of a tenant-scoped name. the tenant is implicit from the session login. Cross-tenant snapshots cannot be created.
* The snapshot time. Only object versions current as of this time will be included.
* Zero or more Metadata qualifiers. Only object versions that match all Metadata Qualifiers will be included.

# Summary
This API would enable remote access to an Object Storage cluster without requiring knowledge of how Manifests or Snapshots are formatted, or any information that would be disclosed in those formats such as the exact location of replicas.

Further the API enables creating new versions as modifications of existing versions so that retained data does not have to be resubmitted. Any required read-modify-write cycles are limited to much shorter distances. The user does not have to control the read-modify-write operation, nor be concerned with its exact scope.

Being chunk aware enabled user compression/decompression, user control of chunk boundaries to improve deduplication efficiency and avoids any transmission of duplicate chunks.

Users will be able to validate stored content without having to keep their own redundant copies of the data or reading the content to be validated.

These changes enable more efficient client operations while increasing independence from the design decisions of the specific object storage cluster in use.
