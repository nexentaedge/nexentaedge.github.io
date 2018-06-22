---
title: Manifest Striping
author: Caitlin bestler
---
Most presentations on erasure encoding describe it in a way that requires the chunk to be striped when it is created, with the parity protection stripes being created at the same time.

For example, to implement a 4:2 protection scheme the Chunk is striped into 4 data striped and 2 parity stripes. If an additive encoding is chosen the data is split over the first 4 stripes. The parity protection is added in the two parity protection stripes.


|Stripe 0|Stripe 1|Stripe 2|Stripe 3|Parity 0|Parity 1|
|--------|--------|--------|--------|--------|--------|
|1/4th payload|1/4th payload|1/4th payload|1/4th payload|p(a,b,c,d)|q(a,b,c,d)|

Even if parity protection generation is deferred the payload must be split into 4 separate stripes when it is put to facilitate erasure encoding, or must be put again when erasure encoding is performed later.

Manifest striping takes chunks as they are created initially, and creates parity protection chunks for them. The only requirement is that all of the  chunks protected by a parity protection chunk will be retained for as long as any of them is retained. Rebuilding any of the lost chunks requires all of the other chunks referenced in the same parity protection chunk. The simplest way to select chunks that will be retained for the same duration is to use the chunks referenced in a single Object Version.

<div class="mermaid">
  graph TD;
  A[Version Manifest]-->B[Parity Protection Manifest];
  B-->C[Parity Protection Set];
  C-->D[Parity Protection Chunk];
  C-->E[Parity Protection Algorithm];
  C-->F[Protected Chunk CHID];
  F-->G[Pairty Protection Chunk];
</div>

Any Version Manifest can have a parallel Parity Protection Manifest. These Manifests are stored on the same servers as the Version Manifests as a different resource fork. They are only retrieved when a Chunk referenced directly or indirectly by the Version Manifest cannot be retrieved.

The Parity Protection Manifest will define multiple Parity Protection Sets. Each set specifies:
* The set of chunks that it protects.
* The algorithm used to generated the Parity Protection Chunk, typically XOR.
* The CHID of Parity Protection Chunk.

Each chunk referenced directly or indirectly by the Version Manifest is included in N Parity Protection Sets, where N is the degree of protection required. If the object version is protected from the loss of any two chunks then each Chunk must be in two different Parity Protection Sets.

Parity Protection Sets with the same algorithm can have at most 1 overlapping protected Chunk. The easiest way to generate such sets is to form the list into a grid, such as 36 unique chunks in a 6x6 grid, and then to have 6 Parity Protection Sets for each row and 6 for each column. Diagonals can be used when protection against the loss of 3 chunks is needed.
Additionally, multiple algorithms can be used. An example of this is the "Q" alogirthm used in RAID-6 or RAID-ZN to complement the "P" algorithm which is simple XOR. More complex erasure codings which generate N protection slices from M data slices can be considered as N different algorithms.

## Advantages
Manifest Striping has several advantages over convetional erasure encoding striping:
* Maniefst Striping retains strong detection of corrupt data without special algorithms or additional metadata. With a striped chunk extra steps and/or data are required to detect corrupt slices.
* No special handling for parity protection chunks unless a missing or corrupt chunk is detected. Even with hierarchical erasure encoding, the Initiator must know how large each stripe is and must schedule retrieval of the entire stripe in an atomic operation.
* Classic erasure encoding does not enable distributed parity protection processing.
* Use of simple XOR encoding enables parallel calculation of parity protection chunks, or parallel rebuild of a lost chunk. Conventional erasure encoding performs the entite operation on one node, requiring one node to gather the entire set of data being striped.


* Discuss transition between replica protect and parity protection, and back *

* When shifting to parity protection, one of the replicas of each chunk can be retained as is. Only the new Parity Protect Chunks must be written, plus a Parity Protection Manifest must be written parallel to the Version Manifest. It is only read when a chunk has been lost, error-free retrievals never fetch the PPCM, just the Version Manifest. *

* Discuss parallel rebuild *
