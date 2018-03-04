---
id: introduction
title: Introduction
sidebar_label: Introduction
---

NexentaEdge is a purpose built and packaged software stack to enable scale-out storage infrastructure for usage with containerized AI/ML frameworks and Big Data/Analytics applications. It is designed to make it easy to integrate an enterprise class storage system with existing networking and compute microservices.

Architecturaly it is software defined clustered object storage solution built upon Cloud Copy on Write (CCOW) idea. Fundamentally it enforces full immutability of any data in the clustered global name space. That is metadata and data chunks are equally made immutable and cannot be modified. Visually it can be presented as classic immutable binary trees data structure managing references to "chunks". In CCOW objects split down into chunks. Those chunks are immutable (“copy-on- write”), and their locations are not stored in the metadata. CCOW supports two types of object payload: an array of bytes and arrays of key/value records. File systems have long distinguished between data and metadata. CCOW stores metadata in Manifest Chunks, and data in Payload Chunks. Both are chunks, with nearly identical operations and characteristics.

NexentaEdge nodes are deployed as containers on physical or virtual hosts, pooling all their storage capacity and presenting it as fully compatbile S3/SWIFT object access for containerized applications running on the same or dedicated servers. Additionally data can be accessed as native block devices (NBD), iSCSI (with optional HA), NFS shares (with optional HA) and as High-Performance NOSQL interface. Storage services are managed through standard Docker tools, for greater agility and scalability.

NexentaEdge designed with High-Performance in mind and provides best in class throughput and latency characteristics. In some cases up to 10x better results.

*NexentaEdge is ideal solution if you want to consolidate multiple data protocol access into one with globally enabled deduplication across all the high-level protocols: S3, SWIFT, NFS, iSCSI, NBD and NOSQL*.
