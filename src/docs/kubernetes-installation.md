---
id: kubernetes-installation
title: Installation NexentaEdge DevOps Edition as a Kubernetes cluster
sidebar_label: Kubernetes Integration
---

**On This Page**

- [Overview](#overview)
- [Configuring to run with High-Performance back-side storage fabric](#configuring to-run-with-high-performance-back-side-storage-fabric)
  - [Step 1: Configuring multi-homed POD network](#step-1-configuring-multi-homed-pod-network)
  - [Step 2: Install NexentaEdge Targets with Replicast IPv6 (bare-metal)](#step-2-install-nexentaedge-targets-with-replicast-ipv6-bare-metal)
  - [Step 3: Install NexentaEdge Management stack](#step-3-install-nexentaedge-management-stack)

## Overview

NexentaEdge is fast, feature rich and easy to use File, Block and Object storage for your Cloud-Native Applications. It is designed to make it easy to integrate an enterprise class storage system with existing "shared-nothing" style storage, networking and compute services.

NexentaEdge deployed as Kubernetes PODs on physical or virtual hosts, pooling allocated storage capacity and presenting it for consumption by applications. NexentaEdge designed with High-Performance and Data Reduction in mind. It provides best in class throughput and latency characteristics while saving overall allocated space with built-in in-line global De-Duplication, Compression and off-line Erasure Encoding.

Once deployed, PV storage can be claimed either via standard S3FS, iSCSI or NFS providers or via CSI (currently available only for Kubernetes >= 1.10). Additionally Cluster name spaces and tenants can be managed via YAML pre-installed CLI and GUI. This further orchestrates Kubernetes service creation.

## Configuring to run with High-Performance back-side storage fabric

In this mode of operation NexentaEdge would utilize dedicated networking backend as a storage fabric.

Network configuration is critical for building a high performance NexentaEdge. The NexentaEdge Target does not perform request routing or dispatching on behalf of the NexentaEdge Initiators (S3, NFS, etc). Instead, NexentaEdge Initiators make requests directly to Target's VDEVs. NexentaEdge Target VDEV in turn performs data replication and other background functions on behalf of Initiator, which means replication and other factors impose additional loads on NexentaEdge Replicast network.

Our Quick Start configurations provide a trivial NexentaEdge configuration file that uses same networking interface for both Initiator Gateways and Replicast. Unless you specifically configure Replicast backend interface(s), NexentaEdge assumes a single "client" network. NexentaEdge functions just fine with a "client" network only, but you may see significant performance improvement with a second dedicated Replicast network.

We recommend running any serious NexentaEdge installation with two networks: a client (front-side) network and a Replicast (back-side) network. To support two networks, each Kubernetes server node where NexentaEdge services (Initiator and Target) will be deployed will need to have more than one networking interface.

There are several reasons to consider operating two separate networks:

**Performance:** NexentaEdge VDEVs handle data replication for the NexentaEdge Initiator requests. When NexentaEdge VDEV replicate data more than once, the network load between NexentaEdge VDEVs easily dwarfs the network load between NexentaEdge Initiators and the VDEVs communicating over Replicast. This can introduce latency and create a performance problem. Recovery and rebalancing can also introduce significant latency on the client network.

**Security:** While most people are generally civil, a very tiny segment of the population likes to engage in what’s known as a Denial of Service (DoS) attack. When traffic between NexentaEdge Targets gets disrupted, dynamic placement and retrieval would not be able to satisfy reservation guarantees of networking protocol, which may prevent users from reading and writing data or introduce serious spikes in operation availability. A great way to defeat this type of attack is to maintain a completely separate Replicast network that doesn’t connect directly to the internet or Kubernetes application's POD network.

### Step 1: Configuring multi-homed POD network

In this step we will explain how to prepare Kubernetes cluster to operate in multi-homed network. We will be using awesome Intel's "Multus" CNI plugin which we prepackaged in DaemonSet format. Read more about Multus CNI plugin here: https://github.com/Intel-Corp/multus-cni

![alt-text](https://raw.githubusercontent.com/Intel-Corp/multus-cni/master/doc/images/multus_cni_pod.png)

Download and edit https://raw.githubusercontent.com/Nexenta/edge-kubernetes/master/multi-network.yaml file and replace as shown below:

```yaml
...
---
apiVersion: "kubernetes.com/v1"
kind: Network
metadata:
  name: replicast
plugin: macvlan
args: '[
         {
	   "type": "macvlan",
	   "master": "rep0", # <= replace with your host back-side interface
	   "mode": "bridge",
	   "mtu": 9000,
           "ipam": {
             "type": "host-local",
             "subnet": "192.168.1.0/24"
           }
         }
       ]'

---
kind: ConfigMap
apiVersion: v1
metadata:
  name: kube-multus-cfg
  namespace: kube-system
  labels:
    tier: node
    app: multus
data:
  multus_conf: |-
    {
      "name": "multus-cni-network",
      "type": "multus",
      "kubeconfig": "/etc/kubernetes/admin.conf",
      "delegates": [{
        "type": "contivk8s", # <= replace with your POD network plugin
        "hairpinMode": true,
        "masterplugin": true
      }]
    }
...
```

Prior to applying YAML file ensure that your primary POD network (or CNI master plugin) is operational. Once this verified and file edited, activate it with:

```
kubectl apply -f multi-network.yaml
```

It will create two Network objects: "client-net" and "replicast" (back-side network).

For "client-net" it is configured to use whatever your choice of client network is and "replicast" it is "macvlan", to provide fully isolated VLAN. In case of bare-metal deployments ensure that Flow Control and Jumbo MTU is properly configured.

Verify that network is configured:

```
kubectl get network -o yaml
```

End result of multi-network configuration is that POD can declaratively select which network to use. In the case of NexentaEdge Initiator it has to be connected to both networks in terms of to provide service to an application and be able to communicate with Replicast Target's VDEVs.

Use the following simple application description to verify:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multus-verify
  annotations:
  networks: '[
    { "name": "client-net" },
    { "name": "replicast" }
  ]'
spec:
  containers:
  - name: multus-verify
    image: "busybox"
    command: ["top"]
    stdin: true
    tty: true
```

Save it to file like multus-verify.yaml and execute:

```
kubectl apply -f multus-verify.yaml
```

If all configured correctly you will see two interfaces inside the POD - eth0 and net0. Login into container and verify that both interfaces are available:

```bash
kubectl exec -it multus-verify -- /bin/sh
/ # ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue qlen 1
   link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
   inet 127.0.0.1/8 scope host lo
   valid_lft forever preferred_lft forever
2: net0@if3: <BROADCAST,MULTICAST,UP,LOWER_UP,M-DOWN> mtu 9000 qdisc noqueue
   link/ether 76:e4:b1:ca:86:30 brd ff:ff:ff:ff:ff:ff
   inet 10.12.0.3/16 scope global net0
   valid_lft forever preferred_lft forever
690: eth0@if689: <BROADCAST,MULTICAST,UP,LOWER_UP,M-DOWN> mtu 1450 qdisc noqueue
   link/ether 02:02:c0:a8:00:05 brd ff:ff:ff:ff:ff:ff
   inet 192.168.0.5/16 scope global eth0
   valid_lft forever preferred_lft forever
```

- net0 is replicast port
- eth0 is client network port

Start few verification pods and double check that ping works for both networks.

### Step 2: Install NexentaEdge Targets with Replicast IPv6 (bare-metal)

To form a cluster of nodes, NexentaEdge Target DaemonSet needs to be deployed on all the nodes where multi-homed network is enabled and Local Persistent Volumes are pre-configured, ready to be claimed.

The following needs to be prepared on each Kubernetes node which is planned to be used to serve NexentaEdge:

- create /mnt/nedge-target-state directory to hold small subset of persistent state data
- create /mnt/nedge-target-data directory and mount all the drives you want to be automatically picked up by the daemon when it starts. Use device's full name rather then kernel name, i.e. scsi-35000c5003013773b instead of sda as a subdirectory
- make sure multi-homed network is enabled for the node
- you minimally need 3 nodes in this configuration

Download and edit https://raw.githubusercontent.com/Nexenta/edge-kubernetes/master/nedge-target-dualnet-lfs-ipv6.yaml
 file if you want to adjust certain parameters.

 Activate NexentaEdge Target DaemonSet:

 ```
 kubectl apply -f nedge-target-dualnet-lfs-ipv6.yaml
 ```

All NexentaEdge software will be executed in its own namespace "nedge". Verify that daemon set started successfully:

```
kubectl get pods -n nedge -o wide
```

### Step 3: Install NexentaEdge Management stack

NexentaEdge Management stack provides Highly-Available REST API endpoint, Management GUI and Audit Trail Analyzer GUI.

Download and edit https://raw.githubusercontent.com/Nexenta/edge-kubernetes/master/nedge-mgmt-ipv6.yaml
 file if you want to adjust certain parameters. It is important to give management pod additional privileges such that kubectl command can work from within POD. Without it, service management functionality will not work.

 * setup neadm alias (optional)

 ```
 alias neadm="kubectl exec -it -n nedge POD_NAME nexenta/nedge neadm"
 ```

 * use NEADM management tool to verify that data container(s) are online

 ```
 neadm system status
 ```

 * use NEADM management tool to initialize cluster

 ```
 neadm system init
 ```

 At this point cluster is fully operational.

 * It takes many efforts to create state of the art storage subsystem which can be useful for many. We highly appreciate your desire to try and learn more. By registering DevOps account you will be part of our fast growing community. Please do not hesitate, register DevOps account [here](https://community.nexenta.com/s/devops-edition)
 * use e-mailed activation key to activate installation:

 ```
 neadm system license set online LICENSE-ACTIVATION-KEY
 ```

 This step is optional and not restricting usage of product in any ways other then the above listed limitation.

 * Try to connect to Management GUI by pointing your browser to port 31080, entering default user name - admin and password - nexenta.
