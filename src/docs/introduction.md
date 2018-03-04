---
id: introduction
title: Introduction
sidebar_label: Introduction
---

NexentaEdge is a purpose built and packaged software stack to enable scale-out storage infrastructure for usage with containerized AI/ML frameworks and Big Data/Analytics applications. It is designed to make it easy to integrate an enterprise class storage system with existing networking and compute microservices.

NexentaEdge nodes are deployed as containers on physical or virtual hosts, pooling all their storage capacity and presenting it as fully compatbile S3/SWIFT object access for containerized applications running on the same or dedicated servers. Additionally data can be accessed as native block devices (NBD), iSCSI (with optional HA), NFS shares (with optional HA) and as High-Performance NOSQL interface. Storage services are managed through standard Docker tools, for greater agility and scalability.

### CCOW: Technology overview

Architecturaly it is software defined clustered object storage solution built upon Cloud Copy on Write (CCOW) idea. Fundamentally it enforces full immutability of any data in the clustered global name space. That is metadata and data are equally made immutable and cannot be modified. Visually it can be presented as classic immutable binary trees data structure managing references to "chunks". In CCOW objects split down into one or more chunks. Those chunks are immutable (“copy-on- write”), and their locations are not stored in the metadata. CCOW supports two types of object payload: an array of bytes and arrays of key/value records. File systems have long distinguished between data and metadata. CCOW stores metadata in Manifest Chunks, and data in Payload Chunks. Both are chunks, with nearly identical operations and characteristics.

With CCOW data format technology provides differentiating capabilites:

- guarantee of total and complete immutability of both Data and Metadata. Users data never gets overwritten and this creates number of advantages among which best in class data consistency and reliability

- transparent bi-directional synchronization between multiple data-centers and clouds

- unique on-demand fetching technique and metadata only synchronization where only needed portions of object has to be fetched from the remote site (upcoming feature)

- global metadata indexing and search with Elastic framework

- embedded audit trails and rule based policy engine

- end-to-end data integrity, resiliance to networking splits and partial cluster availabilities. Data can be transported over long distances without loosing its original consistency

- data (object, files and block volumes) and metadata stored as variable sized chunks, from 8KB to multi MB size chunks depending on I/O pattern requirements for the data access

- cryptographic hash on all chunks stored in the cluster and no need for periodic scrubbing. Data is always consistent

- immutable chunks simplify efficient multi-level caching throughout the scale-out cluster. Performance acceleration without the need for complex cache invalidation logic

- local access point acceleration (network transfers avoidance). Application gateways can access locally provisioned storage, which can still be part of much larger global cluster name space

### FlexHash and Replicast: Technology overview

NexentaEdge is scale-out distributed clustered system of connected servers (nodes). Logically nodes can have designated data storage role, designated gateway role or combination of both roles (mixed). Nodes connected together via Ethernet fabric using low latency and high-performance UDP protocol called Replicast. While distribution of chunks is managed via directing hashing table called FlexHash. FlexHash dynamically organizing and assigns all disks into appropriate so-called "Negotiating Group". Negotiating Group is group of disks distributed across physical servers and racks in accordance with selected policy (server or zone). FlexHash and Replicast provide failure resilient, high-performance and dynamic data placement with inline data-deduplication, high accuracy I/O load balancing, high-performance UDP-based transfers. Differentiating benefits can be summarized as:

- content addressable placement of data within a Negotiating Group. Not a consistent hash ring, improved operational efficiencies of rebalance/join/leave

- dynamic negotiation of the “best device” to store data within that group. “Best” is a function of available device capacity, response time and queue depth, achieve close to 100% device utilization

- no need to transfer data chunk if hash already exists in a Negotiating Group

- transparent handling of hardware failures = Data flows around failures. A server failure simply reduces the number of candidate devices in a Negotiating Group. No need to ever “failback” data to a pre-determined location. It only needs to be in the right Negotiating Group.
Great for seamless handling of network hicups, or server reboots, or server maintenance operations

- nanosecond-level resolution data transfer protocol, using Ethernet and L3/UDP. Cost savings in achieving same or better transfers then with specialized hardware

- standard feature set of reliable storage transport with minimal overhead. Packets handled in user space, zero copy low latency processing

- reliable delivery with “optional” Multi-cast Rendezvous Transfer. Write I/O san be up to 300% faster to transfer 3 replicas on the same networking port





