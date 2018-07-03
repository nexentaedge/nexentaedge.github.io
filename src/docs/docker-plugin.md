---
id: docker-plugin
title: Docker Plugin
sidebar_label: Docker Plugin
---

## Usage:
Create a config file `/etc/ndnfs/ndnfs.json` using this example:

```
{
    "nedgerest":        "1.1.1.1",
    "nedgeport":        8080,
    "username":         "admin",
    "password":         "nexenta"
    "cluster":          "clu1"
    "chunksize":        1048576,
    "serviceFilter":    ""
}
```

## Configuration parameters and default values
| Name      | Description           | Default value | Required |
|-----------|-----------------------|---------------|----------|
| nedgerest | IP or FQDN of NexentaEdge REST API server|         | true |
| nedgeport | Port of NexentaEdge REST API server| 8080 |  true |
| username  | NexentaEdge REST API server user name| admin | true |
| password  | NexentaEdge REST API server password | nexenta | true |
| cluster   | NexentaEdge cluster namespace |  | false |
| tenant    | NexentaEdge tenant namespace  |  | false |
| chunksize | Default volume chunksize in bytes, should be power of two | 1048576 | false |
| forceBucketDeletion | On docker volume remove operation - the bucket will also be deleted | false | false |
| serviceFilter | List of comma delimeted allowed service names to display |  "" means all services allowed | false |

#### Note:
Configuration parameters names are case insensitive


### Install the plugin

```
docker plugin install nexenta/nexentaedge-nfs-plugin --grant-all-permissions
```

### Volume creation
 Now you can create docker volumes backed with NexentaEdge and run containers with them attached. Each docker volume represents a bucket on NexentaEdge. 
 Each volume can be created with different syntax 
 1. Full specified path -  service@cluster/tenant/bucket. Will create volume by specified path.
 2. Automatic service selection - cluster/tenant/bucket. In this case driver select Nedge NFS service with lowest number of NFS exports, hence load balance across all nfs services or across all services remarked in service_filter list
 3. Automatic service selection with cluster and tenant namespace substitution - tenant/bucket. Automaticly select nfs service and subsitute cluster and namenamespace defined as cluster and tenant  options in ndnfs.json file

 All volumes related to default cluster will be shown as tenant/bucket records in list, and can be passed to any docker volume command for run, mount, rm e.t.c
 Volumes not related to default cluster will be shown as cluster/tenant/bucket, and should be used for docker volume operations

```
docker volume create -d nexenta/nexentaedge-nfs-plugin nfs01@clu1/ten1/buc1 (Full volume path specified)
docker volume create -d nexenta/nexentaedge-nfs-plugin clu1/ten1/buc1 (Automatic service selection)
docker volume create -d nexenta/nexentaedge-nfs-plugin ten1/buc1 (Automatic service selection + cluster name subsitution)
docker volume create -d nexenta/nexentaedge-nfs-plugin buc1 (Automatic service selection with cluster and tenant automatic namespace subsitution from ndnfs.json file)
```

#### Note:
If service_filter defined - automatic service balancing will be applied for specified services only. As well as volume list output

Also during volume creation, customer is able to set additional options for new volume

### Options:

| Name      | Description           | Allowed values            | Default value |
|-----------|-----------------------|---------------------------|---------------|
| size      | Set maximum volume size | Size values suffixes Kb, Mb, Gb, Pb | unrestricted |
| chunksize | Chunk size for actual volume, in bytes | should be power of two | 1048576 bytes |
| acl       | Volume acl restrictions |                                       | all |
| ec        | Enables erasure coding for volume | true, false, 0, 1 | false |
| ecmode    | Set erasure mode data mode | "4:2:rs" ,"6:2:rs", "9:3:rs" | 6:2:rs |
| encryption | Enables encryption for volume | true, false, 0, 1 | false |

#### Note:
Options are case sensitive and should be in lower case

Example:

```
docker volume create -d nexenta/nexentaedge-nfs-plugin -o ec=true -o ecmode="4:2:rs" buc1
```

### Run container with already created volume

```
docker run -v nfs01@clu1/ten1/buc1:/Data -it ubuntu /bin/bash  (Full volume path specified)
docker run -v ten1/buc1:/Data -it ubuntu /bin/bash  (Cluster namespace specified in ndnfs.json)
docker run -v buc1:/Data -it ubuntu /bin/bash  (Cluster and tenant namespace specified in ndnfs.json)
```

### Run container and create new volume oneliner
Docker will check volume existance, and if it not exists, new volume will be created

```
docker run -t -d -v nfs01@clu1/ten1/newVolume:/Data --volume-driver=nexenta/nexentaedge-nfs-plugin ubuntu (Full volume path specified)
docker run -t -d -v ten1/newVolume:/Data --volume-driver=nexenta/nexentaedge-nfs-plugin ubuntu (cluster namespace specified in ndnfs.json)
docker run -t -d -v newVolume:/Data --volume-driver=nexenta/nexentaedge-nfs-plugin ubuntu (Cluster and tenant namespace specified in ndnfs.json)
```

### Upgrading plugin
To upgrade plugin of the same tag ('latest' if no tag specified)

```
docker plugin upgrade nexenta/nexentaedge-nfs-plugin --disable-content-trust --grant-all-permissions
```

In case when customer needs to switch to another plugin version

```
docker plugin upgrade nexenta/nexentaedge-nfs-plugin nexenta/nexentaedge-nfs-plugin:<New version tag> --disable-content-trust --grant-all-permissions
```

#### Note:
The old plugin name is retained on upgrade, because only plugin image changed 
To get current plugin branch run command 

```
docker plugin inspect <plugin name> --format {{.PluginReference}}
```
