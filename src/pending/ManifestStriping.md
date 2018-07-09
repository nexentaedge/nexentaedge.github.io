---
title: Manifest Striping
author: Caitlin Bestler
---
Most discussions on erasure encoding describe it with chunks being striped when it is created - both data and parity protection stripes are created at the same time.

For example, to implement an 6:2 protection scheme a conventional erasure coding solution would write a 48 KB chunk as having 6 data stripes and 2 protection stripes, with each stripe being 8KB.

|S0|S1|S2|S3|S4|S5|P0|P1|
|---|---|---|---|---|---|---|---|----|---|
|8KB|8KB|8KB|8KB|8KB|8KB|8KB|8KB|

This obviously requires less space than three full replicas of the 48 KB chunk, but it involves more distinct operations. Since completion is paced by the **slowest** target server selected writing to more of them can result in a longer transaction.

That is true even if creation of the parity stripes is deferred. The payload must still be split into 6 separate data stripes.

When reading the Chunk, it is necessary to read from at least 6 stripes, with completion being paced by stripe behind the longest pending queue.

This also forces the application to work with overly large logical chunks in order to preserve the optimal chunk size for actual disk IO. The logical chunk size is very apparent to applications performing random reads or writes. Even for applications getting/putting full objects the larger logical chunk size adversely impacts buffer utilization on the gateway nodes that the client communicates with.

Manifest Striping is a different technique where chunks are written as supplied, not striped. Parity Protection Chunks are later generated that protect a set of existing chunks. The existing chunks are not modified when parity protection is added.

We call it "Manifest" striping because the set of chunks to be protected are found within Manifests. To provide 6:2 protection, we find 36 unique chunks referenced directly or indirectly in a Version Manifest. We conceptually arrange the 36 chunks in an 6x6 rectangle, and generate a Parity Protection Chunk for each row and each column.

|C0|C1|C2|C3|C4|C5|Parity|
|---|---|---|---|---|---|---|
|a0|a1|a2|a3|a4|a5|a0\^a1\^a2\^a3\^a4\^a5|
|b0|b1|b2|b3|b4|b5|b0\^b1\^b2\^b3\^b4\^b5|
|c0|c1|c2|c3|c4|c5|c0\^c1\^c2\^c3\^c4\^c5|
|d0|d1|d2|d3|d4|d5|d0\^d1\^d2\^d3\^d4\^d5|
|e0|e1|e2|e3|e4|e5|e0\^e1\^e2\^e3\^e4\^e5|
|f0|f1|f2|f3|f4|f5|f0\^f1\^f2\^f3\^f4\^f5|
|a0\^b0\^c0\^|a1\^b1\^c1\^|a2\^b2\^c2\^|a3\^b3\^c3\^|a4\^b4\^c4\^|a5\^b5\^c5\^|
|d0\^e0\^f0|d1\^e1\^f1|d2\^e2\^f2|d3\^e3\^f3|d4\^e4\^f4|d5\^e5\^f5|

So with a 288 KB object ends up being written as 384 KB in 48 distinct locations. The object is protected from concurrent loss of up to 2 of those independent drives.

With conventional erasure encoding the protection from 2 lost stripes comes through the encoding. With manifest striping protection from 2 losses can be achieved with those same algorithms or with simple XOR. Even with the loss of 2 chunks, there will be a row or a column where each lost chunk is the only missing chunk - allowing simple XOR parity protection recovery.

In either case the payload can be written first with replica protection, deferring creation of the parity protection until the object is no longer considered "hot".

The big difference here is not the numbers, but the simplicity. With Manifest Striping a chunk is a chunk. Routine access to a chunk does not even have to know whether it is erasure coded or replica protected. Reading the next 8 KB of an object requires reading the next chunk, not reading a set of 6 stripes.

This has a big impact on the application layer. Do you size the chunks for optimal IOPs, which would pay attention to the stripe size, or for the application logic, which would result in stripes that are too small for optimal IOPs?

This is also a huge difference when there has been a silent error on a disk. With conventional erasure coding there is no easy way to determine which of the N stripes has corrupt data after a read error. Extra metadata and/or extra diagnostics are required. With Manifest Striping chunks remain chunks. NexentaEdge chunk validation can be applied to each blob read.

## Manifest Striping Details
Manifest Striping is actually more flexible than the illustrated example implies. For example, it can use a variety of parity protection algorithms, including the Reed-Solomon based algorithms used by most erasure coding solutions.

Manifest Striping creates a Parity Protection Manifest for each Version Manifest when that version shifts from being replica protected to being parity protected.

<div class="mermaid">
  graph TD;
  A[Version Manifest]-->B[Parity Protection Manifest];
  B-->C[Parity Protection Set];
  C-->D[Parity Protection Chunk];
  C-->E[Parity Protection Algorithm];
  C-->F[Protected Chunk CHID];
  F-->G[Pairty Protection Chunk];
</div>

Parity Protection Manifests are stored on the same servers as the Version Manifests. They are only read after a Chunk get error.  There is zero bandwidth cost for manifest striping in the overwhelming majority of cases where there are no errors.

The Parity Protection Manifest defines multiple Parity Protection Sets. Each set specifies:
* The set of chunks that it protects.
* The algorithm used to generated the Parity Protection Chunk, typically XOR.
* The CHID of Parity Protection Chunk.

The row/column approach used in the example is one simple algorithm for assigning unique chunks to Parity Protection Sets. The actual algorithm can be more flexible. It also should be made aware of failure domains so that no failure domain has 2 members in any Parity Protection Set.

Each chunk referenced directly or indirectly by the Version Manifest is included in N Parity Protection Sets, where N is the degree of protection required. If the object version is protected from the loss of any two chunks then each Chunk must be in two different Parity Protection Sets.

Parity Protection Sets with the same algorithm can have at most 1 overlapping protected Chunk. The easiest way to generate such sets is to form the list into a grid, such as 36 unique chunks in a 6x6 grid, and then to have 6 Parity Protection Sets for each row and 6 for each column. Diagonals can be used when protection against the loss of 3 chunks is needed.

Additionally, multiple algorithms can be used. An example of this is the "Q" algorithm used in RAID-6 or RAID-ZN to complement the "P" algorithm which is simple XOR. More complex erasure codings which generate N protection slices from M data slices can be considered as N different algorithms.

However Parity Protection Sets are initially selected the Parity Protection Manifest merely records the sets. Reconstruction of  missing chunk is driven by the set, not by how it was originally constructed.

## Performance Comparison
Reading N stripes obviously takes longer than reading 1 Chunk. Each additional network transfer adds more overhead.

For many applications it would be possible to simply increase the Chunk size by N so that the stripe written is actually the same size as the Chunk would have been.

But that still has an adverse impact on the Initiator/Gateway. It needs to buffer these mega-chunks and validate them before transferring the read payload to the user. That extra buffer capacity has to come from somewhere, at the expense of dealing with fewer transactions or doing less caching.

Keep in mind that this is a comparison with the **best** conventional erasure encoding algorithms which read only the M data stripes, many implementations read M+N stripes routinely.

There are bigger differences when there are errors.

If there has been corruption in 1 or more of the erasure coded slices of a chunk there is no simple way to know which slice needs to be repaired. Additional metadata or processing is required.

Using XOR saves CPU time, but processors are fast enough that the savings would be difficult to measure. But use of XOR encoding can reduce the time required to rebuild a lost chunk, which is a major benefit.

With the XOR algorithm you still end up with 8 transfers, but they can be done in the time of 3 transfers as in the following example to recover H from a parity protection chunk protecting A,B,C,D,E,F,G and H:
* 1st period: A-->B, C-->D, E-->F, G-->A\^B\^D\^E\^F\^G\^H
* 2nd period: A\^B-->C\^D, E\^F --> A\^B\^C\^D\^E\^F\^H
* 3rd period: A\^B\^C\^D --> A\^B\^C\^D\^H
* which finally results in H.

Taking 3 transfer times to recalculate the lost chunk is considerably faster then 8 transfer times.

Reducing the time required to rebuild lost chunks might seem minor. A typical chunk goes years between rebuilds. But the **duration** of a rebuild is a major factor in reaching desired availability and survivability ratings. The longer any chunk recovery takes the longer the exposure to a second failure is. This may ultimately require protection against the loss of 3 drives to meet the availability/survivability goals.

Of course parallel rebuild is only a benefit if the cluster has at least 9 distinct failure domains. A parity protection set cannot have more members than the number of failure domains without having two chunks in the same failure domain. By definition chunks in the same failure domain can be taken out at the same time by a single failure, eliminating protection fro multiple failures.

## Summary
Manifest Striping has several advantages over conventional erasure encoding striping:
* The logical chunk size is used for actual disk operations.
* There is no impact on read performance (other than losing the benefit from multiple replicas) for reading Manifest Striped chunks. The Parity Protection Content Manifest is not even read until **after** a chunk could not be retrieved.
* Manifest Striping retains strong detection of corrupt data without special algorithms or additional metadata. The per-chunk fingerprint that authenticated the replicated chunks continues to authenticate the sole replica when it is protected by parity protection chunks.
* Use of simple XOR encoding enables parallel calculation of parity protection chunks, or parallel rebuild of a lost chunk.
* When shifting to parity protection, one of the replicas of each chunk can be retained as is. Only the new Parity Protect Chunks must be written, plus a Parity Protection Manifest must be written parallel to the Version Manifest. It is only read when a chunk has been lost, error-free retrievals never fetch the PPCM, just the Version Manifest.
*
