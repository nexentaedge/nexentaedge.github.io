---
title: Namespace Manifests
author: Caitlin Bestler
---
With efficient group messaging a group of storage targets can efficiently manage the collective responsibility for storing Chunks within the group while allowing metadata references to the stored chunks to omit the specific storage targets selected.

That can be extended to find old versions of the stored objects by having each Target track the list of versions stored for each object. But that increases the number of persistent write operations required for each new object version by one.

As covered in the prior blogs, each Version Manifest is immutable. That means that information about a Version Manifest is also immutable. If each Version Manifest is uniquely identified, then the records describing each Version Manifest are also uniquely identified. What NexentaEdge takes advantage of is that if you have a vast distributed collection of immutable unique records can be coalesced into fewer locations where they can be efficiently searched.

We call this master manifest that collects information about all Version Manifests a Namespace Manifest. Each Namespace Manifest deals with one slice of the cluster's namespace and may be sharded over multiple Target machines.

The sharded Namespace Manifest can be organized in a variety of ways to efficiently process more enhanced queries, such as all objects contained within a given scope name, or all object versions with names ending in ".mp3" created in 2015 by a specific user.

The only question with this asynchronous collection of information describing Version Manifests is not the data associated with any Version Manifest (it is immutable) but knowing the range of Version Manifests which **might** exist but could be as of yet unknown to the collected record store.

That can be addressed by including data from each Initiator about what cutoff date they have for new Version manifests. When Initiator X forwards data about Version Manifests it has collected in a batch it notes that it is no longer creating new Version Manifests with a timestamp prior to X.

The collective master manifest therefore knows that it knows all versions manifests dated earlier than these cutoff timestamps.

The Namespace Manifest can therefore answer a query as to what the current Version Manifest was for any set of objects at one point-in-time.[^1] If there are potentially unknown Version Manifests at that time that it might not know of yet then this resulting subset is not yet complete.

[^1]: This requires following certain rules on how you timestamp things, such as never allowing a clock to run backwards and starting with fairly well synchronized clocks.

When it is complete it is a true point-in-time snapshot of a distributed cluster that never stalls any Initiator from creating new object versions because of network issues or the actions of any other initiator.

In photographic terms this is a true point-in-time snapshot, you just have to develop the film before you can make a print. That developing time is the lag time required to collect the records.

Most "snapshots" of distributed storage are anything but "snapshots". They may require a cluster-wide "freeze" to take the snapshot.

Chandry and Lamport in their 1985  [^2] compare the problem of taking a snapshot of a distributed system to that of taking a photograph of a sky full migrating birds. The image is to immense to be captured by a single photograph, and the photographers cannot demand the birds "freeze" to enable photo gathering.

[^2]: Leslie Lamport, K. Mani Chandy: Distributed Snapshots: Determining GlobalStates of a Distributed System.
In: ACM Transactions on Computer Systems 3. Nr. 1, Februar 1985

Others merely supporting creating clones of a specific object version and call the clone a "snapshot".

NexentaEdge provides a true distributed snapshot. Chandry and Lamport algorithm requires end-to-end communication. Ours does not require end-to-end communication to take the snapshot, merely to publish it.

### Missing topics
A snapshot is a subset of the Namespace Manifest.

A snapshot can include any subset of the Version Manifest.

Therefore a snapshot can be used to pre-digest the global cluster's collection of objects to optimize retrieving a specific subset of it.

Most HPC distributed processing is of a pre-identified point-in-time set of data.
