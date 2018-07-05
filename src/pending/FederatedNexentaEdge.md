---
title: Federated NexentaEdge
author: Caitlin Bestler
---
Describing Storage systems as  "federated" dates back to NAS storage. The meaning for federated object storage is basically the same. Users see the same objects/files no matter what site they are accessing, but reading 1 TB of data input on the other end of the continent an hour ago is going to be problematic unless there has been a heavy investment in dedicated bandwidth. When you don't have to think about lag
 the storage system is simply called a cluster, with no modifiers required.

The Federated NexentaEdge feature  provides a single namespace and eventual access to payload across federated clusters.  Just how eventual that payload access is will depend on the speed of the inter-cluster links provisioned. Assuming that cross-continental speeds will probably be limited Federated NexentaEdge prioritizes metadata transfer over payload. A user in Boston can know that there is a new 500 GB object that was input in San Diego more promptly than they can random access the full 500 GBs of payload.

Each NexentaEdge cluster operates autonomously for the simple reason that vast distances and fast operations do not mix. Federated NexentaEdge allows each cluster to operate largely independently, and even allows them to be configured on their own. The SSD to HDD ratio can be different in each cluster, for example. There is no required uniformity for cluster size or replication counts either.

Each cluster typically is a "site", as in "multi-site". We prefer not to use "multi-site" because a cluster can be smaller than a site. Clusters can be divided to provide for optimal performance within each cluster. If a site has great bandwidth within rows, but not between rows then each row should be its own cluster. The same for racks within rows, or rooms within the site as a whole. Theoretically, a cluster could encompass multiple buildings, but inter-building networks seldom have the bandwidth or latency desired.

Wherever you want to draw the boundary between clusters, each cluster will run more or less self-sufficiently. Content will be replicated between the federated clusters,  and replacements for missing or lost chunks will be sought from the other federated clusters, but each cluster is self-sufficient for typical transactions. Cluster do not to rely upon federated peers routinely. If typical transactions require federated peer support users will find response times to be very poor.

A cluster can even be a virtual cluster within a cloud.

Federated NexentaEdge presumes that the cost of networking resources between federated clusters is higher than within each cluster. This assumes that cluster boundaries were chosen with knowledge of network topology. Higher latencies are tolerated for  inter-cluster communications than within a cluster.

Even when globe-spanning 100 Gbit/sec links become available the latency of globe-spanning links will not improve. The speed of light will not be repealed. It will take just as long for the first byte to cross a continent as it does today, i.e. too long. "Faster" networks do not move the first byte faster, they just move more bytes at a time.

In one sense this makes no difference. Shared data stored in multiple locations still requires some form of consensus algorithm to enable shared updates.Without it you have a vulnerability gap whenever two initiators access, update and then store a shared object. Within a cluster that vulnerable window can be measured in msecs. Across a continent it can be measured in minutes. If your organization's workflow already prevents two users from updating the same document at any given time then the vulnerability window is an abstract concern. If not then you are risking one editor wiping out the work done by another editor.

NexentaEdge clusters have a unique "no consensus needed" approach to multi-user updates. This naturally extends to multi-cluster operation, as long as sufficient inter-cluster bandwidth is provided to promptly distribute new metadata federation-wide.

## Meaning of Being Federated
By being "federated" NexentaEdge clusters are providing a global deduplication space for payload chunks and a unified namespace across all federated clusters.

The same CHID (Chunk Identifier) references the same payload anywhere. The CHID is sufficient to find and fetch any chunk, but obviously if you want the object quickly you would prefer that its chunks be present in the current segment.

The same tenant names root the namespace, and the same Name Hash Identifiers (NHIDs) are used to resolve names in each cluster.

To summarize, providng a federated namespace means:
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
* They have a unique chunk identifier (CHID) which is derived from the chunk payload and which will never represent a different set of payload.
* The payload read can be compared against the CHID to detect corrupt payload.
* Either the CHID or the Name Hash Identifier (NHID) can be used to locate chunks within a cluster, or to determine when a chunk is already stored in a peer cluster without having to redundantly transfer payload.
* Chunks are created once, replicated many times and may be eventually expunged - but are never updated. No complex algorithms are required to avoid referencing stale chunks.

All of these characteristics make replicating chunks far simpler for a NexentaEdge cluster than for an object storage system with mutable metadata.

NexentaEdge avoids mutable shared data totally with unique version identifiers. There is no shared data representing which version of an object is 'current' anywhere. Instead each target atomically maintains its own non-shared marker for which version it thinks is the current version for the object, and the Initiator determines which version is current by comparing the versions offered. There is no mutable shared data attribute. Shared data stored in multiple locations can only be updated with some form of cluster-wide consensus algorithm. Everything wrong with requiring cluster-side consensus algorithms gets thousands of time worse when the scope expands to continent-wide or even world-wide consensus algorithms.

Shared mutable data cannot be updated in multiple locations at the same time. That is true whether the replicas are inches apart or thousands of miles apart. You can live with inconsistent data, slow down gets and/or puts to avoid inconsistencies or you can avoid mutable data. NexentaEdge avoids mutable data.

Other object storage systems have shared mutable metadata even if they have immutable copy-on-write payload. Updating the metadata requires a cluster-wide consensus algorithm. Delays from cluster-wide consensus for a small or medium cluster can be tolerable. But it will not scale for federating geographically disperses clusters.

# What To Replicate Where
* Use of snapshots to control.
* Any snapshot can specify payload replication to any cluster.
* Dashboard can monitor how long each is taking, percentage done. It is up to user to balance bandwidth costs versus RPO.
* Default is to replicate all payload everywhere eventually.


## Federation Requirements
To be federated storage clusters must be under unified management. Specifically:
* There is a single set of Network Administrators across all federated clusters.
* There can be no conflict in Tenant names across the federation. 
* The can be no conflicts in how the Tenant specified Authentication Servers resolve the Tenant users across the federated sites. The same authentication server can be specified for each cluster, or a local authentication server can be specified. If multiple servers are used it is assumed that the Tenant is keeping them synchronized. "George" cannot be a different user in San Diego than in Boston. It is not required that "George" be able to login at any site, just that "George" cannot be two different people.
* Chunks are only transferred over provisioned inter-cluster links, which must be provisioned with adequate security.

## Summary
Federated NexentaEdge provides for a globally synchronized namespace with cost effective lagged payload replication. It leverages NexentaEdge's unique "no censensus needed" algorithms to co-ordinate multi-user creation of new versions without risk of data loss no matter how spread the clusters are. The only requirement is sufficient bandwidth to promptly migrate metadata federation-wide.
