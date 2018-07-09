---
title: Chunk Aware S3 Extension API
author: Caitlin Bestler
---
Amazon's S3 is the primary API used to access object storage. However it has a blind spot that makes it suboptimal for any object storage system which stores objects in chunks, especially variably-sized copy-on-write chunks.

Object storage solution using copy-on-write chunks should also support distributed deduplication and some form of snapshotting.

NexentaEdge stores objects as variably sized chunks with global deduplication. This includes the metadata about an object version as well as the payload. Chunk-oriented storage optimizes for representing multiple versions of the same objects in that inter-version intra-object deduplication is common.

So we have an object storage system optimized for multiple versions of the same object accessed by an API that does not support editing of objects. Every Put has to supply the entire object. A chunk aware API can allow the client to put a new version by specifying what has changed from a reference version rather than requiring the entire object.

Efficiently supporting edits is only the first benefit of a chunk-aware API.

A chunk-aware API allows applications to choose chunk boundaries. This increase the probability of retaining prior chunks in a new object version, or even of finding common chunks between different objects. Simply choosing boundaries that are application meaningful, such as not splitting documents on paraagraph boundaaries can increase successful deduplication. A chunk-aware API would enable the application to hint at optimal chunk boundaries.

Chunks are globally deduplicated, which avoids redundant storage and network bandwidth - but only *after* the object has been Put using S3. A chunk-aware API would let the client submit the chunk fingerprint before transmitting it to detect duplicates and avoid unnecessary payload retransmission.

Deduplication occurs **after** data compression, because the storage target needs to validate the fingerprint of received and stored chunks. Having to decompress every chunk to validate it before transmitting the compressed chunk would be very time consuming. To avoid this the client must be allowed to compress chunks themselves.

None of this is supported in the base s3 protocol. This wastes bandwidth over the links to the S3 processing point carrying uncompressed and potentially duplicate payload.

Copy-on-write chunks enable object cloning and snapshotting sets of objects without requiring any payload copying. Different storage systems will vary on exactly how this is done, but being to create a snapshot without having to stop the world while copying vast amounts of payload will always be useful. See some of the previous blogs on how NexentaEdge's snapshots are particularly efficient and powerful.

But, again, the base S3 API provides no support for creating or using snapshots of any kind other than full replication of an existing object.

This document proposes a set extensions to the S3 API to address these limitations. These are strict extensions: additional methods and additional metadata modifiers to existing methods. All of the already defined S3 commands are left as is. The S3 protocol already supports addition of user-defined metadata fields to any object.

## Anticipated Deployment of the Chunk-Aware API
Application developers are never quick to rely upon new APIs, even clean extensions to existing APIs. This is why the current proposed chunk aware API was not originally intended to be a public API.

The internal goal was  to support an S3 Proxy Container that could be co-deployed using Kubernetes or Docker on or near the host machine the Client code was running on. Such a container could offer as-is support to the client while optimizing wire traffic between the client host and a NexentaEdge cluster. The client to S3-entry point bandwidth would still be wastefull, but that would all be virtual network bandwidth. No extra wire bandwidth would be consumed.

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
The S3 API already supports ranged gets. This already translates to fetching only the specific chunks required. No further optimizatio of the API is needed. Applications do not need to explicitly request chunks using their Chunk IDs.

## Editing Objects
Users edit objects by creating a new pending object, applying edits to the pending object and then committing the pending object. As with Getting objects, there are no explicit maniupulation of chunk references. However, chunk identifiers (CHIDS) are used to probe for duplicate chunks.

To enable specifying edits that are more complex than simple appends a single put can be spread over multiple commands. However this remains a single operation that is considered to take place when the transaction is completed, not when each portion of it is specified.

Edits are made to a pending object which is not visible to any other user until the commit. If the session performing the transaction is terminated the pending object version is aborted and all changed discarded. The user may also explicitly abort a pending object version.

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
* Zero or more Metadata qualifiers. Only object versions that match all Metadata Qualifiers will be included.

# Summary
This API would enable remote access to an Object Storage cluster without requiring knowledge of how Manifests or Snapshots are formatted, or any information that would be disclosed in those formats such as the exact location of replicas.

Further the API enables creating new versions as modifications of existing versions so that retained data does not have to be resubmitted. Any required read-modify-write cycles are limited to much shorter distances. The user does not have to control the read-modify-write operation, nor be concerned with its exact scope.

Being chunk aware enabled user compression/decompression, user control of chunk boundaries to improve deduplication efficiency and avoids any transmission of duplicate chunks.

Users will be able to validate stored content without having to keep their own redundant copies of the data or reading the content to be validated.

These changes enable more efficient client operations while increasing independence from the design decisions of the specific object storage cluster in use.
