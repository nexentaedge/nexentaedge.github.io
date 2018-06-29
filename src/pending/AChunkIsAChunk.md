---
title: A Chunk Is A Chunk
author: Caitlin Bestler
---
In the prior blog on Manifest Striping I explained that one of the advantages of NexentaEdge's Manifest Striping strategy is that payload chunks remained payload chunks. The code did not have to deal with some stored assets being payload chunks while others were merely stripes of erasure coded chunks.

This is actually a very core principle for NexentaEdge. Storage targets deal with Chunks and very little else. It is not just simple, it is militant simplicity.

Every Chunk has a CHID (Chunk Identifier). The CHID encodes the algorithm that was used to generate it, and then information derived from the chunk content.

No matter which CHID algorithm was used, the CHID can be used to validate that the stored payload matches the CHID and to request any target holding the chunk to retrieve it.

If the payload stored for a chunk does not match the CHID then that replica is void. It is not repaired, it is replaced. There is no state where a replica is "being repaired", a chunk is either stored on a target or it is not.

Any storage target can validate any of the chunks it has stored locally at any time. If it invalidates its copies then it has probable cause to suspect that the chunk is not adequately protected. It can therefore trigger an evaluation of whether the chunk is adequately represented. That same evaluation can actually be triggered by any node that is aware that a Chunk should exist. The storage target that 'lost' the replica is not privileged in any way to be a designated location for that chunk.

Any node on the replicast network can validate the data retention of any chunk. If there are enough replicas and/or parity protection chunks no further action is needed, otherwise replication or repair is needed.

The closest thing to complexity in all of this is that Version Manifests are stored based on their Name Hash Identifier (NHID). Name-based searches use the NHID to determine which Negotiating Group to query. But the Version Manifests reported back all have self-validating CHIDs and can be retrieved from the targets reporting them using those CHIDs.

Once the essentials are understood about Chunks their other attributes are more easily understood. For example, why are chunks variably sized?

The ultimate answer is to support streamed access of user encrypted objects.

Encryption has to be performed on a per-chunk basis, if performed on the whole object it would be necessary to retrieve the entire object before the first byte of it could be given to application layer. In the most extreme case it would be necessary to download an entire 2 hour movie before watching the opening credits.

Encryption is done after compression, if you can compress encrypted data then your encryption algorithm is horrendously weak.

Chunks that are fixed sizes before compression end up being variably sized compressed chunks.

Since the storage servers and network protocols must deal with variably sized compressed chunks there is really no reason for them to insist that the logical chunk sizes be fixed.
