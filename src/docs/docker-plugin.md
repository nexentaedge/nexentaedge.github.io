---
id: docker-plugin
title: Docker Plugin
sidebar_label: Docker Plugin
---

## Usage:
* Create a config file in /etc/ndnfs/ndnfs.json using this example:

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

Where
```
    nedgerest:  IP or FQDN of NexentaEdge REST API server
    nedgeport:  Port of NexentaEdge REST API server (default value is 8080)
    username:   NexentaEdge REST API server user name (default value is admin)
    password:   NexentaEdge REST API server password (default value is nexenta)
    chunksize:  Default volume chunksize in bytes, should be power of two (default value is 1048576 bytes) Optional
    service_filter: List of comma delimeted allowed service names to display  Optional
```
### Install the plugin

<code>docker plugin install nexenta/nexentaedge-nfs-plugin --grant-all-permissions</code>

### Volume creation
 Now you can create docker volumes backed with NexentaEdge and run containers with them attached. Each docker volume represents a bucket on NexentaEdge. When creating a volume make sure to specify a complete path to bucket: service_name@cluster_name/tenant_name/bucket_name

<code>docker volume create -d nexenta/nexentaedge-nfs-plugin nfs01@clu1/ten1/buc1</code>

Also during volume creation, customer is able to set additional options for new volume

Options:

```
    size:               Set maximum volume size, allowed size suffixes Kb, Mb, Gb, Pb
    chunksize:          Chunk size for actual volume, in bytes, should be power of two
    acl:                Volume acl restrictions
    enableErasure:      Enables erasure coding for volume. Allowed values [true, false, 0, 1]
    erasureModes:       Set erasure mode data mode. Allowed values ["4:2:rs", "6:2:rs", "9:3:rs"], should be set if enableErasure is true
    enableEncryption:   Enables encryption for volume. Allowed values [true, false, 0, 1]
```
Example:

<code>docker volume create -d nexenta/nexentaedge-nfs-plugin:dev -o enableErasure=true -o erasureMode="4:2:rs" nfs01@clu1/ten1/buc1</code>

### Run container with already created volume
<code>docker run -v nfs01@clu1/ten1/buc1:/Data -it ubuntu /bin/bash</code>

### Upgrading plugin
In case when customer needs to switch to another plugin version

<code>docker plugin upgrade nexenta/nexentaedge-nfs-plugin:latest nexenta/nexentaedge-nfs-plugin:<New version tag> --disable-content-trust --grant-all-permissions</code>

#### Note:
After plugin upgrade its has still previous name, because only plugin image changed 
To get current plugin branch run command 

<code>docker plugin inspect <plugin name> --format {{.PluginReference}}</code>

### Modifying config
If you changed any config options, you will need to restart the plugin for changes to take effect.

<code>docker plugin disable nexenta/nexentaedge-nfs-plugin</code>
<code>docker plugin enable nexenta/nexentaedge-nfs-plugin</code>

### Using Private Registry

Make sure you have docker registry up and running

On docker registry install the plugin

<code>docker plugin install --alias localhost:5000/nexenta/nexentaedge-nfs-plugin nexenta/nexentaedge-nfs-plugin</code>

Verify that the plugin is installed 

<code>docker plugin ls</code>

Push plugin into local registry

<code>docker plugin push localhost:5000/nexenta/nexentaedge-nfs-plugin</code>


On docker nodes pull image from registry

<code>docker plugin install registry-ip:5000/nexenta/nexentaedge-nfs-plugin<code>
