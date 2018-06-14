---
title: Supporting Directory Operations With a Flat Name Index
author: Caitlin Bestler
---

Traditional file systems allow renaming of directories or moving files from one directory to another, but with a giant asterisk. Rename operations are not allowed unless the existing and new names are both part of the same file system.

You probably think of your entire file namespace as 'the file system', so breaking that namespace down into multiple 'file systems' may well strike you as just as excuse for telling you that they won't support the rename that you just requested. It is especially annoying that you are expected to remember which of your directories you created as 'file systems' and which are mere directories.

However, there are actually reasons why renaming across file systems are difficult. These issues ultimately require a different implementation strategy to support efficient rename operations for scale-out cloud storage.

Hierarchical directories enable efficient renaming within a single-server file system, but are ultimately incompatible with scale-out storage. Most object storage solutions have solved this problem by disallowing rename operations, but there is a way to support directory operations while keeping the efficient "flat" name indexes used in object storage.

Distributed multi-user storage systems either have to be copy-on-write or have very complex algorithms to ensure read operations are completed consistently. Nobody want a read operation to return a mix of data that was overwritten with partial new data. They want the read to either return the data as it was before someone else's write or to yield data that is entirely after the other user's write. Both NexentaStor and NexentaEdge are copy-on-write solutions.

The challenge for copy-on-write systems  is that any update to an object/file theoretically requires updating all of its parent directories. This would result in a tremendous write amplification if each write required its own write to each of its parent directories. Each server is required to only acknowledge a write only after the write and all derived writes are "done". You can't say 'it's done' and later say "oops, sorry". "Done" means "done".

Fortunately the acknowledgement does not require all of those writes be "done" in the sense that they are in their final format, just that the write is "persistently stored". Updating of parent directories can be deferred as long as the deferred edits will be reflected in all transactions going forward and that the changes will not revert if the system reboots. Basically, the edit has to be reflected in working memory and saved persistently to disk. But it does not have to be saved to disk in the permanent format.

Instead the final format writes can be deferred until later. Until then journal entries guarantee the writes will be eventually completed and not forgotten during a system restart.

Deferring writes spreads them out. The number of writes required before the initial write can be acknowledged is greatly reduce. Even the eventual number of writes can be reduced because a single committing write to a parent directory can frequently reflect more than one pending transaction.

The reason that writing to the journal is considered safe is that each file system will reapply pending writes from the journal when restarting.

Ensuring that an acknowledged transaction will always look as though it was fully completed no matter what is not simple logic. But it is at least a tractable problem on a single server file system. Maintaining a journal across multiple servers is far more complex. Just consider how many different recovery scenarios have to be dealt with. Any one of the servers can fail. A second server might fail while a first server is attempting to recover. Enumerating the problem is difficult, solving it correctly even more so.

There are ways to maintain a journal across multiple servers, but not without slowing down each and every commit.
Traditional File System referenced by a Mount Point

Federated NAS solutions, such as NFSv4, solve this by mapping prefix names to different 'mount points'. Each is its own root file system, journal and a distinct storage pool for at least the metadata, and each has its own repository for the file system metadata. The question is how big should each file system be? Larger file systems enable a wider scope of rename operations but also create a processing bottleneck for metadata operations.

That is why object storage systems have favored eliminating bottlenecks. They effectively make each object its own file system. Having a scope of a single file means there are no directory rename operations.

You can clone an existing object with a new name and hopefully only have the system copy metadata, not payload. But even that requires two operations: creating the clone and then marking the old name for deletion. Cloning an entire tree, if supported, requires copying metadata for each object within the renamed tree. Not having to replicate the payload is a big advantage, but an entire tree of metadata is still an extensive copy operation can be acknowledged

Object storage systems restrict move operations for a very good reason. Getting and putting objects that cannot be moved elsewhere in the namespace hierarchy is simple and straight-forward. Creation of each replica can be acknowledged by the single storage target creating that replica. The creation of each replica can be a simple atomic operation that a single target either completes or does not.
These simplifications allow quick completion of the most common transactions. It is hard to even imagine a scenario where directory rename operations would be more common than puts.

What we want is to keep the benefits of simple puts while enabling directory move operations to be performed. Our goals are simple:
* The number of operations required to get an object should not be dependent on the number of sub-directories in the path name.
* The put of each replica of the Version Manifest must remain a single atomic transaction performed on a single storage target.
* Directory Operations need to have linear execution times that are not dependent on the number of objects that are conceptually enclosed in a directory.

Directory Operations can be supported by defining a new type of Object Version that encodes Links. These objects are otherwise like any other Object Version except that they have abbreviated Version Manifest formats.

A File Link encodes minimal key-value metadata, including a linked-to Version Manifest. This specifies the linked to NHID and the VM-CHID of the specific version.

A Directory Link encodes mapping of all names matching a prefix to a new prefix. Versions must be created both for the Directory Link From and Directory Link To names.
These records enable resolving names created either by a 'ln' command or by a 'mv' command.

The namespace manifest records for these Link objects enable mapping a time-dependent name that may have been linked or renamed to a stable name in the fully distributed namespace. It avoids the need to edit the names in the Namespace Manifest.

NexentaEdge's ability to make coherency guarantees while operating with the efficiency of eventual consistency is dependent on two rules:
* Every operation is performed atomically by a specific storage target. That storage target can acknowledge the creation of a replica once the atomic put of the chunk is safe via journaling local to that storage target.
* All operations on metadata are commutable. It does not matter which order the operations are performed, as long as they are all eventually applied the final results are identical (the same records are in all replicas of the namespace manifest and the fully distributed name indexes all have the same current version of the object).

Modifying Namespace Manifest records from '/X/Y' to '/X/Z' would break these rules s:
* Two rename operations cannot be applied in either order if they both seek to change the same name.
* Changing all '/X/Y' records to '/X/Z' records can involve two or more namespace manifest shards.

We can solve this with Directory Links. A Directory Link specifies where objects/files within this Directory can be found in the fully distributed namespace. This is itself a versioned object. Of course moving a directory requires creating two of these object versions, one to activate the new name and one to hide the old name.

Updating a Link is just putting a new object version. The new object versions have unique version identifiers, making noting their existence in the Namespace Manifest safe.
An Initiator can transactionally 'edit' a directory by putting the new version of the Directory Link We can extend the Version Manifest put transaction to define a 'conditional put' which requires that successful completion of the new version can only complete if it is the only version for this generation.

Rather than requiring all name resolutions to go through this process we can require that all namespaces follow the normal object rules, that is they are unmoveable, unless movability has been specifically enabled with a metadata key-value pair for an enclosing directory.

These extra object types enable support for directory renames without negatively impacting the performance of object gets and puts. The user regains the ability to publish using links and to re-organize their namespace by moving directories.

Defining Link objects effectively allows direcgtory operations while keeping the benefits of a flat name index. Further, it does not require pre-designating specific directories as "file systems" and limiting the scope of certain oprations to conform to file system boundaries. Nor are we forcing all objects into top-level "buckets" with no support at all for directory rename operations.
