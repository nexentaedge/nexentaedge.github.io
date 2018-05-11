---
id: kubernetes-quick-start-solo
title: Quick Start NexentaEdge as a Kubernetes Solo cluster
sidebar_label: Kubernetes Quick Start "Solo"
---

## Overview

NexentaEdge is fast, feature rich and easy to use File, Block and Object storage for your Cloud-Native Applications. It is designed to make it easy to integrate an enterprise class storage system with existing "shared-nothing" style storage, networking and compute services.

NexentaEdge deployed as Kubernetes PODs on physical or virtual hosts, pooling allocated storage capacity and presenting it for consumption by applications. NexentaEdge designed with High-Performance and Data Reduction in mind. It provides best in class throughput and latency characteristics while saving overall allocated space with built-in in-line global De-Duplication, Compression and off-line Erasure Encoding.

Once deployed, Kubernetes PV (Persistent Volume) storage can be claimed either via standard S3FS, iSCSI or NFS providers or via CSI (currently available only for Kubernetes >= 1.10). Additionally Cluster name spaces and tenants can be managed via YAML pre-installed CLI and GUI. This further orchestrates Kubernetes service creation.

NexentaEdge "Solo" is specially packaged installation method to quickly deploy on a single node setup. It can be used either as advanced access-point for Multi-Cloud inter segment name space distribution or as a local demo or development setup.

## Requirements and Limitations
It is highly recommended that you run NexentaEdge Kubernetes PODs on a nodes with sufficient amount of memory and CPU cores as explained in table below:

| Requirement | Notes |
|---------------|---------|
| Kubernetes|1.9 or higher |
| CPU | 4 cores minimally recommended |
| Memory | 4GB Minimum + 2GB x # of HDDs or SSDs |
| Minimum individual Disk size | 1GB |
| Minimal number of disks per Data Container | 4 |
| Max raw capacity per Data Container | up to 132TB |

NexentaEdge DevOps limitations:

| Resource | Limit |
|------------|-------|
| Max Total Logical Used Capacity (*)| 16TB |

(*) Logical Used Capacity is what application logically allocates. Example would be: iSCSI LUN of 1TB would allocate 1TB of logical. The other example would be: while total raw capacity of 4 servers is 256TB it is still possible to install software with DevOps license initially and then later convert it to unlimited Enterprise (try and then buy model)

## Installation

If you currently do not have Kubernetes installed please follow these instructions on getting it up and running:

https://kubernetes.io/docs/tasks/tools/install-minikube/

Once Kubernetes configured and operating properly, download [YAML file](https://raw.githubusercontent.com/Nexenta/edge-kubernetes/master/nedge-cluster-lfs-solo.yaml) and edit your site local parameters:

- Prepare "state" local PV `/mnt/nedge-target-state`. It can be just empty directory available for kubelet to consume.
- Prepare "data" local PV `/mnt/nedge-target-data`. Either keep it empty or mount pre-formatted drives to it.
- Ensure that /usr/bin/kubectl command is available on the path. This will be used by management POD to start / stop / reconfigure storage services.

#### For Minikube recommended configurational tips:

- If Minikube is executed with VM driver option (default), it would expose storage as mountpoint /mnt/sda1. Change nedge-target-data PV's path from /mnt/nedge-target-data to /mnt/sda1/nedge-target-data. Snippet example:

```yaml
...
---
kind: PersistentVolume
apiVersion: v1
metadata:
  name: nedge-target-data
  labels:
    type: local
spec:
  persistentVolumeReclaimPolicy: Retain
  storageClassName: local-storage
  capacity:
    storage: 1000Gi
  accessModes:
    - ReadWriteOnce
  hostPath:
    path: "/mnt/nedge-target-data"   <= change this to "/mnt/sda1/nedge-target-data"
...
```

- By default kubectl isn't available on the path inside the minikube when it is configured with VM driver option. NexentaEdge management POD needs it available. Download and expose kubectl binary to the minikube:

```
mkdir -p ~/.minikube/files/usr/bin
curl -LO https://storage.googleapis.com/kubernetes-release/release/v1.10.2/bin/linux/amd64/kubectl && chmod +x ./kubectl
cp kubectl ~/.minikube/files/usr/bin/
minikube stop
minikube start
```

When ready, simply execute the following command:

```
kubectl create -f nedge-cluster-lfs-solo.yaml
```

In a few minutes, try to connect to the GUI on port 31080, which would be exposed on all Kubernetes hosts.

In case of `minikube` find out the right IP address with `minikube service list` command.

Default login user: admin, password: nexenta.

Follow Wizard steps to finish installation and connect w/ us on Slack!

## Troubleshooting tips

Kubernetes is an awesome and powerful orchestration framework. But when you just start using it, it can be difficult to digest such enormous set of material available online. In this section we collecting some useful diagnostics that  can be run from the command line:

| Command | Notes |
|---------------|---------|
| minikube ssh|Login inside minikube VM in case if it is running with VM driver option|
| ls ~/.minikube/files| Directory location through which user can copy files from host to minikube VM|
|minikube service list| Minikube command which lists IP:PORT pairs accessible from host|
| kubectl create -f file.yaml| Create all objects as defined in file.yaml|
| kubectl delete -f file.yaml| Delete all objects as defined in file.yaml. It will preserve data in /mnt/...|
| kubectl get pods -n nedge| Verify that PODs in NexentaNedge namespace "nedge" are running|
| kubectl describe pods -n nedge| Describe statuses of NexentaEdge PODs|
