---
title: Snapshots as Datasets
author: Caitlin Bestler
---
File System snapshots enable users to create a frozen image of a file system hierarchy (or equivalent object namespace) in a low cost operation so that the user can rollback to that time whenever needed. Preserving more versions of a file or object obviously consumes more disk space, but snapshots in copy-on-write storage systems can be created and released with very low transactional costs.

But snapshots do not have to be limited to rolling hierarchical slices of a filesystem namespace. They can be used to identify any set of object/files. Once a set of object versions has been identified the snapshot can be used to facilitate access to that data.

Distributed compute jobs, such as Machine Learning algorithms, frequently need to identify a set of data for processing purposes. These may be training sets, or test sets, or merely an expression of a set which is the results of a specific step in a distributed compute job.

NexentaEdge has defined snapshots to be durable caches of version manifest data for any set of objects which the creaqtor of the snapshot finds interesting. Many users will never identify any snapshots beyond those defined by the top levels of their file system naming hierarchy.

But any collection of data can be identified as a snapshot.
Machine Learning developers have created special file formats to encode arbitrary structured collections of data. A primary example is HDF5 (https://www.hdfgroup.org/HDF5/). The advantage of such formats is that they allow sets of structured data to be communicated with a single object.

Snapshots can perform the role of identifying a frozen set of data, but without requiring that data to be copied.

Using a snapshot to convey a dataset has all the advantages of HDF5 aggrgate formats, but without requiring extra copies of the data.

This can be a major advantage when different datasets identify overlapping sets of raw data. Six snapshots referencing the same data all pin the same set of payload. The cost ofidentifyig an additional dataset is low even if you are identifying 4 PB of data.

A snapshot does more than identify a set of data at a specific time, it can optimize the process of translating names within the collected set of dlisheata to the required raw data chunks that must be retrieved. A snapshot has already resolved the set of hierarchical path names ("/a/b/c/d ...") to the set of referenced chunks. The receiving node can even start fetching the chunks before the compute layer specifically requests them.

This is providing all the streamlining benefits of the aggregating containers such as HDFS, without paying to replicate the data for each dataset referencing data redundantly.


## scattered thoughts to include
A dataset is more than a collection of data, it is also a label that references a theory as to why a specific set of data is an interesting set to consider. Indeed, there can be many different theories referencing different slices of same set of data that each rrepresent different thoughts highlighted by the selected data.

Contrast:
* Named bill-of-material with the names of raw data slices.
* HDF5: allows publisher to reorganize raw data to new theory and collect data for streamlined processing,
  but you cannot publish the theory until you have physically collected (and replicated) the raw payload.
  * snapshot: we only have to reference the data. Aggregation can be deferred until after the identified set has been communicated.
