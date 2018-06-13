---
title: Snapshot Manifests
author: Caitlin bestler
tags: NexentaEdge,Distributed Storage,snapshots
---
Snapshot Manifests are NexentaEdge's implementation of a traditional copy-on-write snapshot applied to a fully distributed eventually consistent storage cluster.

Snapshot Manifests are versioned objects which specify a precise set of object versions. The are created as a subset of a master distributed record store describing all object versions within a specific namespace, typically a Tenant. We will describe the Namespace Manifest and its construction in a later blog.

 Snapshot Manifests can be used in all the ways that traditional file system snapshots can be used. They can even be used in many additional ways.

Snapshot Manifests are created by users. Unlike traditional file system snapshots they are not file system objects. Snapshots can be taken of any subset of a Namespace Manifest, not just of pre-designed file systems. There are no file system limits imposed on the number of snapshots that can be kept. They are created by end users for end user purposes.

##Deferred Enumeration Snapshots
A new version of a Snapshot Manifest can be created in an instant capturing a true point in time snapshot of the selected subset of the namespace. The version is first expressed as a rule which specifies the set of information to be extracted from a Namespace Manifest. The actual information extracted replaces this content once it has been extracted. Before then the version exists, but cannot be retrieved.

The set of objects referenced by a Snapshot Manifest does not have to be known by the creator of the Snapshot. The Snapshot does not even have to be for 'now'. Snapshots can be created covering any point-in-time in the past where the referenced data has not yet been expunged.

Because snapshots are a subset of a Namespace Manifest they can even be the starting point for further refining the subset by applying further qualifiers to further limit the included set. New snapshots can also be created by merging the records from existing snapshots as long as they were both subsets of the same original namespace.

##Consistent Snapshots
By following some simple rules for time-stamping Object Versions it is easy to create Snapshot Manifests which can be consistent for a specific application. They are consistent in that they either fully include a transaction or fully exclude it, a snapshot never captures a transaction that is halfway done.

When it is complete it is a true point-in-time snapshot of a distributed cluster that never stalls any Initiator from creating new object versions because of network issues or the actions of any other initiator. The snapshot time is not when a set of target machines 'takes' a bunch of distributed snapshots, it is the filter that identifies the set of records to be extracted.

It is not even necessary to identify the snapshot time in real-time. Rather than co-ordinating a cluster-wide quiescent point in real time it would be possible to compare transaction logs after the fact to determine when the application was quiescent after the fact.

##No 'Freeze' Allowed
Chandry and Lamport in their 1985 paper[1] compare the problem of taking a snapshot of a distributed system to that of taking a photograph of a sky full migrating birds. The image is too immense to be captured by a single photograph, and the photographers cannot demand the birds "freeze" to enable photo gathering.

Any "snapshot" solution that impedes ongoing transactions in any way is the equivalent of demanding the migrating birds to freeze. The birds won't listen to you, and the distributed storage servers shouldn't be interfered with.

Some "snapshot" solutions require the application layer to effectively gather this ultra-wide screen photo collage themselves by "snapshotting" only the versions known to a specific node at the time of the snapshot. You can snapshot a directory, but only if you already know the latest version of everything in that directory.

This is not effective when the whole purpose of the snapshot is to enable processing of all data collected as of time X. You can only get the list of all data collected by time X if you already know all data collected by time X.

Other solutions merely support creating a clone of a specific object version and then calling that clone a "snapshot".

NexentaEdge provides a true distributed snapshot. Chandry and Lamport algorithm requires end-to-end communication. Ours does not require end-to-end communication to take the snapshot, merely to publish an extract. Periodic snapshots can be taken every hour on the hour, not every hour at the first second of that hour when the network was fully healthy.

With this strategy, NexentaEdge can be accepting new object versions from hundreds of sources concurrently, and still take a point-in-time snapshot at any time that specifies a consistent set of object versions. These snapshots can be taken automatically at specified times even when the network is partitioned. The 2:00 AM snapshot will reflect 2:00 AM, not the first moment after 2:00 AM when the network was fully healed.

Because all of the information about a Version Manifest is unique and immutable a Snapshot can cache any portion of the information form the Version Manifest in the snapshot itself. While this makes the snapshot object larger, it can speed up access to the snapshot objects. This can allpw distributed compute jobs to publish results as a snapshot, allowing single-step access to the referenced chunks by clients who effectively "mount" the snapshot.

##File System Snapshots
Traditional file system snapshots from copy-on-write filesystems such as ZFS enabled taking snapshots without making the world 'freeze' first. Snapshots enable rollback to prior points, reading old versions of files and efficient replication of file system changes between multiple sites.

The initial design goal for NexentaEdge snapshots was simply to replicate those features. Taking point-in-time snapshots on single-system file servers is relatively easy, because ultimately there is a single transaction queue. Snapshots can be taken between transactions. Doing that in a distributed system would require complex cluster-wide synchronization. But building snapshots as an extract of a collection of transaction log entries enables something even more powerful - the snapshots are no longer bound to be for a limited number of pre-identifiable snapshot-eligible mount points. Snapshots can be for any set of objects/files no matter what directory they are located 'within', and selection is lot limited to specifying a directory and all descendants.

The chosen subset can be for any set of matching object/file names.

The subset can be further refinded by requiring any number of metadata field matches. For example a snapshot could be limited to objects owned by a specific user.

The snapshot time can be chosen after the fact to be a time when no node had initiated a transaction but not yet completed it It is not necessary to determine this instant in real-time, merely before the earliest possible expunging of data that the snapshot should protect.

There is even an easier method for an application to avoid the risk of a snapshot inlucing only a portion of a transaction, it can force the timestamps for all object versions created as part of a transaction to have the same timestamp.

##Multiple Applications Can Snapshot The Same Data
Because a snapshot is an application object that merely pins the referenced data different applications can create their own snapshots that reference the same files.

Multiple snapshots taken "at the same time" do not slow the system down any at the nominal snapshot time. There is a non-zero amount of metadata creation required for each snapshot, but no payload chunks need to be replicated and there are no critical path dependencies waiting for the new snapshots to finish their extraction job.

One Application Can Snapshot The Same Data Many Times
It even makes sense for a single application to take different snapshots of different subsets of a larger pool of data. Machine Learning applications work with both Training Sets and Testing Sets. Both are subsets of a larger set of objects. Snapshots are a storage and communications efficient method of identifying these sets.

Snapshots provide the same "containerizing" of a set of data as aggregating container formats such as HDF5, but without replicating the actual payload.

Snapshots can become the representation of "datasets" as used in Machine Learning applications. Multiple snapshots can each specify different selections of data, providing a single handle for referencing that set.

Snapshots can be any set of object versions, making them useful for reporting the results of object queries.

##Snapshot Optimized Data Retrieval
Snapshots are not limited to identifying the set of object versions referenced behind a given tag. They can be used to optimize retrieval of the data referenced in a specific snapshot:
* Any record within a Version Manifest can be included in the Snapshot Manifest. This can eliminate some or all access to the Version Manifest when the client accesses the object using the snapshot.
* The local storage layer can pre-fetch non-cached Version Manifests and/or payload chunks as soon as the client indicates that it intends to access data via a snapshot (by "mounting" the snapshot). This can particularly optimize multi-stage HPC jobs.

##Summary
Snapshot Manifests enable creation of true point-in-time snapshots of an eventually consistent distributed storage system. Any criteria can be applied to identify the specific subset of objects to be included in the snapshot. Once created the Snapshot Manifest can be used to access that data, to optimize processing of that data as a set, to clone that point in history or rollback to it.

The Snapshot Manifest goes beyond the traditional file system snapshot and becomes a far more generalized expression of a dataset.


[1]: Leslie Lamport, K. Mani Chandy: Distributed Snapshots: Determining GlobalStates of a Distributed System.
In: ACM Transactions on Computer Systems 3. Nr. 1, February 1985.
