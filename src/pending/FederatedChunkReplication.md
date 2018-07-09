---
title: Federated Chunk Replication
author: Caitlin Bestler
---
In the prior blog we discussed how federating multiple clusters is simplified by NexentaEdge's immutable self-validating location-independent chunks. Having a philosophical strategy for replicating chunks between federations is not the same thing as actually replicating them. A specific strategy for selecting which chunk is replicated via what pipe to what cluster is needed. This strategy utilizes relayed replication over provisioned inter-cluster links and prioritization of metadata chunks.

The same strategies to replicate chunks within a cluster do not scale to federated clusters that may span continents. The higher latency of inter-cluster communications requires a new strategy for using network resources. The inescapably longer latencies caused by geographical dispersion alone forces the clusters to operate independently, with all synchronization being asynchronous.

Given asynchronous semantics and potentially limited inter-cluster bandwidth Federated NexentaEdge prioritizes replication of metadata between clusters using provisioned inter-cluster tunnels.

Federated NexentaEdge replicates chunks between clusters rather than Object versions. Object versions are collection of chunks, so they are replicated but the replication benefits from global deduplication.  Any given chunk is only replicated once across the entire federation.

Chunk oriented replication allows prioritizing replication of Version Manifests over Payload Chunks. With limited inter-cluster bandwidth it is important to synchronize the shared namespace before optimizing actual retrieval of payload.

For data integrity purposes it would have been preferable to replicate Payload before replicating any Manifest that reference the payload. It is simpler to never replicate a chunk containing a reference to a chunk that has not already been replicated. Dangling or premature pointers make things complicated. However, requiring that referenced chunks be replicated before referencing chunks would delay synchronization far too long. 

Relaxed replication rules requires that each cluster be tolerant of 'missing' chunks. Before declaring an object to be lost the cluster will query its federated peers to fetch the missing or corrupt chunk on demand.

Obviously retrieving chunks from remote clusters will take longer that reading it locally.  Status messages reporting "this is going to take a bit longer" are required within each cluster to delay an error return.

However, it is not necessary to always conduct a federation-wide probe for a chunk before taking action locally. For example, we can accept a new Chunk even if it **might** be stored in another federated cluster. Chunks are globally unique. The same chunk identifier (CHID) can never refer to different payload. Accepting the payload locally is redundant, but it is faster than fetching the payload from a remote cluster.

With this strategy objects can be made available even before they can be fully replicated as long as aggregate access is still sparse. If you want to access the full 2 PB added in another cluster within 1 hour then you need a lot of bandwidth between those clusters. The federation software can prioritize intelligently, it cannot migrate content for free.

## Federation-Wide Replication
To federate multiple clusters you have to connect them, frequently over networking links not under the provider's physical control. Explicitly identifying virtual links makes it easy to control encryption over hostile territory and to secure SLA guarantees on minimal bandwidth and maximum latency. It can also enable efficient replication to multiple sites where the network distances between the sites varies.

While the tunnels must be explicitly provisioned there is no need to construct forwarding maps. The federation software will find the shortest distribution tree for each chunk over the up links automatically. You can add a new cluster just by linking it in somewhere, perhaps even redundantly. You no more need to plan the forwarding between clusters than you would plan the forwarding of Ethernet frames between switches.

Consider the following set of federated clusters with relatively sparse links between them:

<div class="mermaid">
graph LR;
A-->B;
A-->C;
B-->D;
B-->E;
C-->D;
E-->F;
F-->G;
D-->F;
D-->G;
</div>

There are multiple paths a chunk could take starting from A. What we want is to forward any chunk down one link at most once, and to reliably traverse the entire tree even when one or more of the links is temporarily down.

If you take the same diagram and declare A to G to be switches connected by physical links then the diagram will suddenly look like it was designed for the Spanning Tree Algorithm.

In fact using Spanning Tree was the first solution considered for federating clusters: treat each cluster as though it were a switch, each tunnel as though it were a link and apply the spanning tree algorithm to create a distribution tree that was loop free. After all, spanning tree code is already on every computer.

But on further examination the problem of federating clusters is even simpler. The Spanning Tree algorithm was designed for switches, which are adverse to remembering anything. A storage cluster's very reason for existence is to remember what Chunks it has stored.

So the very simple global replication algorithm is simply:

<div class="mermaid">
  graph TD;
  A[Receive Chunk]-->B(Chunk Already Stored Locally?);
  B-->|No|C[Store Chunk Locally];
  C-->D[Forward Via Other Inter-Cluster Links];
    B-->|Yes|Done;
</div>

Spanning Tree ultimately deactivates a set of the links (probably B-D, D-F and F-G). The result is a tree where each frame can simply be forwarded out all ports that it was not received upon ad the frame will reach all switches. When any link fails the switches re-evaluate their deactivations. For example if A-B is down then B-D will be activated.

Federated NexentaEdge relies on global deduplication instead. Chunk X will be proposed to D by both B and C, but it will only be a new chunk for the first. The second transmission of Chunk X will be a duplicate.

Work through some examples. As long as every cluster is ultimately connected and the queues within each cluster are persistent you'll see that every Chunk will be replicated to every cluster. Further, no Chunk will  be redundantly delivered to any cluster. There will be no looping.

Relayed Replication fully replicates a new chunk through the entire federation faster because each round of replication doubles the number of replication sources. The time to probe whether a peer needs a given chunk is trivial compared to the actual chunk transfer.
