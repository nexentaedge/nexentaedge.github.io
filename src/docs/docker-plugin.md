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
    "chunksize":        1048576,
    "service_filter":   ""
}
```

## Configuration parameters and default values
| Name      | Description           | Default value | Required |
|-----------|-----------------------|---------------|----------|
| nedgerest | IP or FQDN of NexentaEdge REST API server|         | true |
| nedgeport | Port of NexentaEdge REST API server| 8080 |  true |
| username  | NexentaEdge REST API server user name| admin | true |
| password  | NexentaEdge REST API server password | nexenta | true |
| chunksize | Default volume chunksize in bytes, should be power of two | 1048576 | false |
| service_filter | List of comma delimeted allowed service names to display |     | false |


### Install the plugin

```
docker plugin install nexenta/nexentaedge-nfs-plugin --grant-all-permissions
```

### Volume creation
 Now you can create docker volumes backed with NexentaEdge and run containers with them attached. Each docker volume represents a bucket on NexentaEdge. When creating a volume make sure to specify a complete path to bucket: service_name@cluster_name/tenant_name/bucket_name

```
docker volume create -d nexenta/nexentaedge-nfs-plugin nfs01@clu1/ten1/buc1
```

Also during volume creation, customer is able to set additional options for new volume

### Options:

| Name      | Description           | Allowed values            |
|-----------|-----------------------|---------------------------|
| size      | Set maximum volume size | Size values suffixes Kb, Mb, Gb, Pb |
| chunksize | Chunk size for actual volume, in bytes | should be power of two |
| acl       | Volume acl restrictions |                                       |
| enableErasure  | Enables erasure coding for volume | true, false, 0, 1 |
| erasureModes | Set erasure mode data mode | "4:2:rs" ,"6:2:rs", "9:3:rs" |
| enableEncryption | Enables encryption for volume | true, false, 0, 1 |


Example:

```
docker volume create -d nexenta/nexentaedge-nfs-plugin:dev -o enableErasure=true -o erasureMode="4:2:rs" nfs01@clu1/ten1/buc1
```

### Run container with already created volume

```
docker run -v nfs01@clu1/ten1/buc1:/Data -it ubuntu /bin/bash
```

### Upgrading plugin
In case when customer needs to switch to another plugin version

```
docker plugin upgrade nexenta/nexentaedge-nfs-plugin:latest nexenta/nexentaedge-nfs-plugin:<New version tag> --disable-content-trust --grant-all-permissions
```

#### Note:
The old plugin name is retained on upgrade, because only plugin image changed 
To get current plugin branch run command 

```
docker plugin inspect <plugin name> --format {{.PluginReference}}
```
