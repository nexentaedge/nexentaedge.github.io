---
title: Manifest Striping
author: Caitlin Bestler
---
Most discussions on erasure encoding describe it with chunks being striped when it is created - both data and parity protection stripes are created at the same time.

For example, to implement an 5:2 protection scheme a conventional erasure coding solution would write a 40 KB chunk as having 5 data stripes and 2 protection stripes, with each stripe being 8KB.

|S0|S1|S2|S3|S4|P0|P1|
|---|---|---|---|---|---|---|---|----|---|
|8KB|8KB|8KB|8KB|8KB|8KB|8KB|

Even if parity protection generation is deferred the payload must still be split into 8 separate stripes to facilitate erasure encoding.

NexentaEdge uses a different technique we call Manifest Striping. Chunks are written as supplied, not striped. Parity Protection Chunks are generated that apply to a set of existing chunks.

We call it "Manifest" striping because the set of chunks to be protected are found within Manifests. To provide 5:2 protection, we find 25 unique chunks referenced directly or indirectly in a Version Manifest. We conceptually arrange the 25 chunks in an 5x5 rectangle, and generate a Parity Protection Chunk for each row and each column.

|C0|C1|C2|C3|C4|Parity|
|---|---|---|---|----|---|
|a|b|c|d|e|a\^b\^c\^d\^e|
|f|g|h|i|j|f\^g\^h\^i\^j|
|k|l|m|n|o|k\^l\^m\^n\^o|
|p|q|r|s|t|p\^q\^r\^s\^t|
|u|v|w|x|y|u\^v\^w\^x\^y|
|a\^f\^k\^p\^u|b\^g\^l\^q\^v|c\^h\^m\^r\^w|d\^i\^n\^s\^x|e\^j\^o\^t\^y|   |

So with scheme a 200 KB object ends up being written as 280 KB in 35 distinct locations. The object is protected from concurrent loss of up to 2 of those independent drives.

In either case the payload can be written first with replica protection, deferring creation of the parity protection until the object is no longer considered "hot".

The big difference here is not the numbers, but the simplicity. With Manifest Striping a chunk is a chunk. Routine access to a chunk does not even have to know whether it is erasure coded or replica protected. Reading the next 8 KB of an object requires reading the next chunk, not reading a set of 5 stripes.

This is also a huge difference when there has been a silent error on a disk. With conventional erasure coding there is no easy way to determine which of the N stripes has corrupt data after a read error. Extra metadata and/or extra diagnostics are required. With Manifest Striping chunks remain chunks. Each chunk is self-validating on its own

## Manifest Striping Details
Manifest Striping is actually more flexible than the illustrated example implies. For example, it can use a variety of parity protection algorithms, including the Reed-Solomon based codes used in most erasure coding solutions.

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

Each chunk referenced directly or indirectly by the Version Manifest is included in N Parity Protection Sets, where N is the degree of protection required. If the object version is protected from the loss of any two chunks then each Chunk must be in two different Parity Protection Sets.

Parity Protection Sets with the same algorithm can have at most 1 overlapping protected Chunk. The easiest way to generate such sets is to form the list into a grid, such as 36 unique chunks in a 6x6 grid, and then to have 6 Parity Protection Sets for each row and 6 for each column. Diagonals can be used when protection against the loss of 3 chunks is needed.

Additionally, multiple algorithms can be used. An example of this is the "Q" algorithm used in RAID-6 or RAID-ZN to complement the "P" algorithm which is simple XOR. More complex erasure codings which generate N protection slices from M data slices can be considered as N different algorithms.

The row/column example cited earlier is just one method of forming Parity protection Sets. The data format does not care how the sets were identified.

## Advantages
Manifest Striping has several advantages over conventional erasure encoding striping:
* Manifest Striping retains strong detection of corrupt data without special algorithms or additional metadata. The per-chunk fingerprint that authenticated the replicated chunks continues to authenticate the sole replica when it is protected by parity protection chunks.
* No special handling for parity protection chunks unless a missing or corrupt chunk is detected. Even with hierarchical erasure encoding, the Initiator must know how large each stripe is and must schedule retrieval of the entire stripe in an atomic operation.
* Classic erasure encoding does not enable distributed parity protection processing.
* Use of simple XOR encoding enables parallel calculation of parity protection chunks, or parallel rebuild of a lost chunk. Conventional erasure encoding performs the entire operation on one node, requiring one node to gather the entire set of data being striped.
* An object can be transitioned between replica and parity protection, and back again, without needing to throw away any already existing content. Excess replicas become eligible for release after parity protection is replaced, but they are still valid should replica protection be re-enabled before they are expunged.
* When shifting to parity protection, one of the replicas of each chunk can be retained as is. Only the new Parity Protect Chunks must be written, plus a Parity Protection Manifest must be written parallel to the Version Manifest. It is only read when a chunk has been lost, error-free retrievals never fetch the PPCM, just the Version Manifest.
* Use of multiple parity protection sets and the XOR algorithm allow rebuilding a lost chunk to be done in parallel. Reducing the time span required to rebuild a lost chunk can be beneficial for larger clusters where having some chunk being rebuilt is an ongoing process.
