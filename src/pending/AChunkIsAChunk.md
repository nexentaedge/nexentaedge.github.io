---
title: A Chunk Is A Chunk
author: Caitlin Bestler
---
There are some other NexentaEdge blogs in progress dealing with erasure coding and multi-site/cloud support.

But they both raise a common theme that I thought was worth talking about first.

Both of these features are made far simpler because NexentaEdge itself has adopted militant simplicity on its architectural principles.

Specifically, a chunk is a chunk.

This allows for erasure coding where no special code is required to deal with stripes of a chunk.

We also replicate chunks between multiple federated clusters, not stripes nor whole objects.

NexentaEdge Chunks are always the same, no matter what.

Every Chunk has a CHID (Chunk Identifier). The CHID encodes the algorithm that was used to generate it, and then information derived from the chunk content using that algorithm.

No matter which algorithm was used, the CHID can validate that the stored payload matches. The CHID can be used to request any target holding the chunk to retrieve it.

If the payload stored for a chunk does not match the CHID then that replica is void. The replica is replaced, not repaired. There is no state where a replica is "being repaired", a chunk is either stored on a target or it is not.

Similarly there is no state where a Chunk, or even an object version, is "being updated". A chunk either exists or it does not. An object version either exists or it does not.

There are no clever algorithms to figure out which replicas should be avoided on read because they are stale.

Any storage target can validate any of the chunks it has stored locally at any time. If it invalidates its copies then it has probable cause to suspect that the chunk is not adequately protected. It can therefore trigger an evaluation of whether the chunk is adequately represented. That same evaluation can actually be triggered by any node that is aware that a Chunk should exist. The storage target that 'lost' the replica is not privileged in any way to be a designated location for that chunk.

Any node on the Replicast network can validate the data retention of any chunk. If there are enough replicas and/or parity protection chunks no further action is needed, otherwise replication or repair is needed.

The closest thing to complexity in all of this is that Version Manifests are stored based on their Name Hash Identifier (NHID). Name-based searches use the NHID to determine which Negotiating Group to query. But the Version Manifests reported back all have self-validating CHIDs and can be retrieved from the targets reporting them using those CHIDs.

Once the essentials are understood about Chunks their other attributes are more easily understood. For example, why are chunks variably sized?

The ultimate answer is to support streamed access of user encrypted objects.

Encryption has to be performed on a per-chunk basis, if performed on the whole object it would be necessary to retrieve the entire object before the first byte of it could be given to application layer. In the most extreme case it would be necessary to download an entire 2 hour movie before watching the opening credits.

Encryption is done after compression, if you can compress encrypted data then your encryption algorithm is horrendously weak.

Chunks that are fixed sizes before compression end up being variably sized compressed chunks.

Since the storage servers and network protocols must deal with variably sized compressed chunks there is really no reason for them to insist that the logical chunk sizes be fixed.
