---
id: kubernetes-quick-start-solo
title: Quick Start NexentaEdge as a Kubernetes Solo cluster
sidebar_label: Kubernetes Quck Start "Solo"
---

## Overview

NexentaEdge is fast, feature rich and easy to use File, Block and Object storage for your Cloud-Native Applications. It is designed to make it easy to integrate an enterprise class storage system with existing "shared-nothing" style storage, networking and compute services.

NexentaEdge deployed as Kubernetes PODs on physical or virtual hosts, pooling allocated storage capacity and presenting it for consumption by applications. NexentaEdge designed with High-Performance and Data Reduction in mind. It provides best in class throughput and latency characteristics while saving overall allocated space with built-in in-line global De-Duplication, Compression and off-line Erasure Encoding.

Once deployed, Kubernetes PV (Persistent Volume) storage can be claimed either via standard S3FS, iSCSI or NFS providers or via CSI (currently available only for Kubernetes >= 1.10). Additionally Cluster name spaces and tenants can be managed via YAML pre-installed CLI and GUI. This further orchestrates Kubernetes service creation.

NexentaEdge "Solo" is specially packaged installation method to quickly deploy on a single node setup. It can be used either as advanced access-point for Multi-Cloud inter segment name space distribution or as a local demo or development setup.

## Installation

Download YAML file and edit your site local parameters:

- Prepare state local PV `/mnt/nedge-target-state`. It can be just empty directory.
- Prepare storage local PV `/mnt/nedge-target-data`. Either keep it empty or mount pre-formatted drives to it. Minimally 4 drives is recommended.
- Ensure that /usr/bin/kubectl command is available on the path. This will be used by management POD to start / stop / reconfigure storage services.

Once these are ready, simply execute the following command:

```
kubectl create -f https://raw.githubusercontent.com/Nexenta/edge-kubernetes/master/nedge-cluster-lfs-solo.yaml
```

In a few minutes, try to connect to the GUI on port 31080.
Follow Wizard steps to finish installation.
