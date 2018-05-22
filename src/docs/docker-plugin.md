---
id: docker-plugin
title: Docker Plugin
sidebar_label: Docker Plugin
---

## Usage:
Create a config file in /etc/ndnfs/ndnfs.json using this example:
```
{
    "nedgerest":    "1.1.1.1",
    "nedgeport":    8080,
    "chunksize":    1048576,
    "username": "admin",
    "password": "nexenta"
}
```

### Install the plugin
```docker plugin install nexenta/nexentaedge-nfs-plugin```

 Now you can create docker volumes backed with NexentaEdge and run containers with them attached. Each docker volume represents a bucket on NexentaEdge. When creating a volume make sure to specify a complete path to bucket: docker_volume_name@service_name/tenant_name/bucket_name
```docker volume create -d nexenta/nexentaedge-nfs-plugin nfs01@clu1/ten1/buc1```
```docker run -v nfs01@clu1/ten1/buc1:/Data -it ubuntu /bin/bash```

### Modifying config
If you changed any config options, you will need to restart the plugin for changes to take effect.
```docker plugin disable nexenta/nexentaedge-nfs-plugin```
```docker plugin enable nexenta/nexentaedge-nfs-plugin```

## Using Private Registry
* Make sure you have docker registry up and running
* On docker registry install the plugin
``` docker plugin install --alias localhost:5000/nexenta/nexentaedge-nfs-plugin nexenta/nexentaedge-nfs-plugin ```
* Verify that the plugin is installed
```  docker plugin ls ```
* Push plugin into local registry
``` docker plugin push localhost:5000/nexenta/nexentaedge-nfs-plugin ```
* On docker nodes pull image from registry
``` docker plugin install registry-ip:5000/nexenta/nexentaedge-nfs-plugin ```
