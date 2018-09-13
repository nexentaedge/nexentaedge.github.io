---
id: kubernetes-csi
title: Kubernetes CSI
sidebar_label: Kubernetes CSI
---

## Usage:

1. Deploy NexentaEdge cluster on [Baremetal](https://nexentaedge.io/docs/baremetal-installation.html) or [NexentaEdge DevOps edition](https://nexentaedge.io/docs/kubernetes-installation.html)  cluster.

2. Download NexentaEdge CSI plugin repository from https://github.com/Nexenta/nexentaedge-csi-driver

	Move to plugin folder 
	```
	cd /nexentaedge-csi-driver
	```

3. Configure CSI driver options and NexentaEdge cluster discovery via kubernetes secret

	Configuration file placed at ./kubernetes/secret/cluster-config.json

	The secret intended to configure both NexentaEdge clusters - standalone as well as In-Cluster NexentaEdge cluster deployment

Secret file configuration options:

```
{
    "nedgerest":        "1.1.1.1",
    "nedgeport":        "8080",
    "username":         "admin",
    "password":         "nexenta",
    "cluster":          "clu1",
    "tenant":           "ten1",
    "chunksize":        1048576,
    "serviceFilter":    ""
}
```
#### Configuration parameters and default values

| Name      | Description           | Default value | Required |
|-----------|-----------------------|---------------|----------|
| nedgerest | IP or FQDN of NexentaEdge REST API server in case of standalone(baremenal) NexentaEdge cluster|         | true |
| nedgeport | Port of NexentaEdge REST API server| 8080 |  true |
| username  | NexentaEdge REST API server user name| admin | true |
| password  | NexentaEdge REST API server password | nexenta | true |
| cluster   | NexentaEdge cluster namespace |  | false |
| tenant    | NexentaEdge tenant namespace  |  | false |
| chunksize | Default volume chunksize in bytes, should be power of two | 1048576 | false |
| forceBucketDeletion | On docker volume remove operation - the bucket will also be deleted | false | false |
| serviceFilter | List of comma delimeted allowed service names to filter |  "" means all services allowed | false |

#### Note:
Configuration parameters names are case insensitive

If 'nedgerest' parameter is absent then NexentaEdge cluster will be discovered in CSI plugin namespace 'nedge'


## Configure NexentaEdge cluster and create secret
Check configuration options and create kubernetes secret for NexentaEdge CSI plugin 
```
kubectl create secret generic nexentaedge-cluster --from-file=./kubernetes/secret/cluster-config.json 
```

## Deploy NexentaEdge CSI plugin

To deploy NexentaEdge CSI plugin

```
kubectl apply -f ./kubernetes/
```

There should be three NexentaEdge VSI plugin pods available

```
...
NAMESPACE     NAME                                    READY     STATUS    RESTARTS   AGE
default       csi-attacher-nedgeplugin-0              2/2       Running   0          18s
default       csi-provisioner-nedgeplugin-0           2/2       Running   0          18s
default       nexentaedge-csi-plugin-7s6wc            2/2       Running   0          19s
```

## Pre-provisioned volumes (NFS) on NexentaEdge cluster

Allow to use already created exports in NexentaEdge services
Customer should be able to create PersistentVolume specification 

[link to Pre-provisioned volumes manifest specification](https://kubernetes-csi.github.io/docs/Usage.html#pre-provisioned-volumes)

To test creation and mount pre-provisioned volume to pod execute example

#### Note:
Make sure that volumeHandle: clus1/ten1/buk1 in nginx.yaml already exist on NexentaEdge cluster

Examples:
```
kubectl apply -f examples/pre-provisioned-nginx.yaml #one pod with pre-provisioned volume
kubectl apply -f examples/deployment.yaml            # 10 pods deployment shares one NexentaEdge bucket
```

## Dynamically provisioned volumes (NFS)

To setup the system for dynamic provisioning, the administrator needs to setup a StorageClass pointing to the CSI driver’s external-provisioner and specifying any parameters required by the driver

[link to dynamically provisioned volumes specification](https://kubernetes-csi.github.io/docs/Usage.html#dynamic-provisioning)

#### Note:
For dynamically provisioned volumes kubernetes will generate volume name automatically
(for example pvc-871068ed-8b5d-11e8-9dae-005056b37cb2)
Additional creation options should be passed as parameters in storage class definition i.e :

```
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: csi-sc-nedgeplugin
provisioner: nexentaedge-csi-plugin
parameters:
  tenant: ten1
  encryption: true

```

### Options:

| Name      | Description           | Allowed values            | Default value |
|-----------|-----------------------|---------------------------|---------------|
| cluster   | NexentaEdge cluster namespace if not defined in secret |       |  |
| tenant    | NexentaEdge tenant  namespace if not defined in secret |       |  |
| chunksize | Chunk size for actual volume, in bytes | should be power of two | 1048576 bytes |
| acl       | Volume acl restrictions |                                       | all |
| ec        | Enables ccow erasure coding for volume | true, false, 0, 1 | false |
| ecmode    | Set ccow erasure mode data mode (If 'ec' option enabled) | "4:2:rs" ,"6:2:rs", "9:3:rs" | 6:2:rs |
| encryption | Enables encryption for volume | true, false, 0, 1 | false |

#### Note:
Options are case sensitive and should be in lower case

Example:
```
kubectl apply -f examples/dynamic-nginx.yaml
```


## Troubleshooting and log collection

In case any problems using NexentaEdge CSI driver 
1. Check CSI plugin pods state
```
kubectl describe pod nexentaedge-csi-plugin-xxxxx
```
2. Check provisioned pods state
```
kubectl describe pods nginx
```
3. Check CSI plugin logs
kubectl logs csi-attacher-nedgeplugin-0 -c nfs
kubectl logs csi-provisioner-nedgeplugin-0 -c nfs
kubectl logs nexentaedge-csi-plugin-j8ljf -c nfs
...
