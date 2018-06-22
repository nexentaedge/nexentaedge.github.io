---
title: Federated NexentaEdge
author: Caitlin Bestler
---
Federated NexentaEdge allows multiple NexentaEdge storage clusters to share a single namespace and optionally synchronize payload storage across the full set.

Each NexentaEdge cluster operates autonomously and can be configured separately. Options such as the replication count do not have to be identical across the federation.

Each cluster typically is a "site", as in "multi-site". We prefer not to use "multi-site" because a cluster can be smaller than a site. Clusters can be divided to provide for optimal performance within each cluster. If a site has great bandwidth within rows, but not between rows then each row should be its own cluster. The same for racks within rows, or rooms within the site as a whole. Theoretically, a cluster could encompass multiple buildings, but inter-building networks seldom have the bandwidth or latency desired.

Wherever you want to draw the boundary between clusters, each cluster will run more or less self-sufficiently. Content will be replicated between the federated clusters,  and replacements for missing or lost chunks will be sought from the other federated clusters, but each cluster to be self-sufficient for typical transactions and not to rely upon federated peers routinely.

Federated NexentaEdge presumes that the cost of networking resources between federated clusters is higher than within each cluster. It assumes that cluster boundaries were chosen with knowledge of network topology. It ill therefore tolerates far higher latencies for queue inter-cluster communications than within a cluster.

Even if globe-spanning 10 Gbit/sec links someday become available the latency of globe-spanning links will not improve. The speed of light will not be repealed, and it will take just as long for a single to cross a continent as it does today, and that is too long. "Faster" networks do not move the first bit faster, they just move more bits at a time.

The difference is in probabilities. It is possible for two initiators to both create a successor to the same object within a single cluster, but it requires that the two edits be launched at virtually the same instant. What qualifies as the same "instant" goes from being measured in msecs to being measured in seconds or minutes for a global federation.

## Meaning of Being Federated

No matter how much payload has been replicated there is still global deduplication across all of the federated clusters. The same CHID (Chunk Identifier) references the same payload anywhere. The CHID is sufficient to find and fetch any chunk, but obviously if you want the object quickly you would prefer that its chunks be present in the current segment.

Providing a federated namespace means:
* Universal CHIDS and NHIDS
* Universal Tenants
* Universal Users - but with local Authentication
* Prioritized Version Manifest replication
* Eventual Consistency is eventual Consistency, but you are more likely to see it at these scales.
* Loop-free all-segment replication without a distribution tree.
* On put, NexentaEdge creates a local replica rather than testing to see if it is stored elsewhere first. If the chunk already existed then it would have been replicated to this cluster eventually anyway.
* On get, federated clusters are check for referenced chunk before the chunks are declared lost.
* Name resolution is local to each cluster, which is why replication of Version Manifests is prioritized.
* Universal Payload Replication followed by policy driven payload replication driven by snapshots.
* Each federated cluster can have its own policies, numbers of targets, etc.

## Immutable, Globally Unique, Self-Validating Chunks
NexentaEdge chunks have critical attributes that make replicating them across a federation far simpler:
* They hava a unique chunk identifier (CHID) which is derived from the chunk payload and which will never represent a different set of payload.
* The payload read can be compared against the CHID to detect corrupt payload.
* Either the CHID or the Name Hash Identifier (NHID) can be used to locate chunks within a cluster, or to determine when a chunk is already stored in a peer cluster without having to redundantly transfer payload.
* Chunks are created once, replicated many times and may be eventually expunged - but are never updated. No complex algorithms are required to avoid referencing stale chunks.

All of these characteristics make replicating chunks far simpler for a NexentaEdge cluster than for an object storage system with mutable metadata.

NexentaEdge avoids mutable shared data totally with unique version identifiers. There is no shared data representing which version of an object is 'current' anywhere. Instead each target atomically maintains its own non-shared marker for which version it thinks is the current version for the object, and the Initiator determines which version is current by comparing the versions offered. There is no mutable shared data attribute. Shared data stored in multiple locations can only be updated with some form of cluster-wide consensus algorithm. Everything wrong with requiring cluster-side consensus algorithms gets thousands of time worse when the scope expands to continent-wide or even world-wide consensus algorithms.

Shared mutable data cannot be updated in multiple locations at the same time. That is true whether the replicas are inches apart or thousands of miles apart. You can live with inconsistent data, slow down gets and/or puts to avoid inconsistencies or you can avoid mutable data. NexentaEdge avoids mutable data.

Other object storage systems have shared mutable metadata even if they have immutable copy-on-write payload. Updating the metadata requires a cluster-wide consensus algorithm. Delays from cluster-wide consensus for a small or medium cluster can be tolerable. But



## Replicating Chunks

Optimizing inter-cluster communications for higher latency and probably lower bandwidth requires adjusting the networking strategy. The first adjustment is  replicating Chunks rather than Object versions. Object versions are collection of chunks, so they are replicated but the replication benefits from global deduplication.  Any given chunk is only replicated once across the entire federation.

Chunk oriented replication allows prioritizing replication of Version Manifests over Payload Chunks. With potentially limited inter-cluster bandwidth it is important to synchronize the shared namespace before optimizing actual retrieval of payload.

For data integrity purposes it would have been preferable to replicate Payload before replicating any Manifest that reference the payload, but this would delay synchronizing the namespace for far too long. 

This requires that each cluster be tolerant of 'missing' chunks. Before declaring an object to be lost the cluster will query its federated peers to fetch the missing or corrupt chunk on demand.

Obviously retrieving chunks from peer clusters will take longer that reading it locally. Special "this is going to take a bit longer" status messages are required within each cluster to delay an error return. For example, we would not to delay accepting a new Chunk because it **might** be stored in a federated cluster. Chunks are globally unique. Either the payload matches, in which case redundantly storing payload in multiple clusters is fine, or the payload is different. Version Manifests always include the source address, and therefore can never be duplicates.

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

Work through some examples. If the links are reliable and the queues persistent you'll see that every Chunk will be replicated to every cluster and no Chunk will traverse any link twice or be redundantly delivered to any cluster.

Relayed Replication fully replicates a new chunk through the entire federation faster because each round of replication doubles the number of replication sources. The time to probe whether a peer needs a given chunk is trivial compared to the actual chunk transfer.

## Federation Requirements

To be federated storage clusters must be under unified management. Specifically:
* There is a single set of Network Administrators across all federated clusters.
* There can be no conflict in Tenant names across the federation. 
* The can be no conflicts in how the Tenant specified Authentication Servers resolve the Tenant users across the federated sites. The same authentication server can be specified for each cluster, or a local authentication server can be specified. If multiple servers are used it is assumed that the Tenant is keeping them synchronized. "George" cannot be a different user in San Diego than in Boston. It is not required that "George" be able to login at any site, just that "George" cannot be two different people.
* Chunks are only transferred over provisioned inter-cluster links, which must be provisioned with adequate security.
