---
title: Dynamically Subsetting a Backend Network
author: Caitlin Bestler
---
Orchestration layers, such as Kubernetes, already allow for custom network configurations to be tagged. Pods can be tagged to limit access to ny resource, including networks, to pods having a matching tag.

But provisioning a high performance low latency network requires careful planning, at least if more than a single non-blocking switch is required. It is not something that the cloud provider will want to do for each dynamically created virtual cluster. This does not mean that the only alternative is to require all cloud applications to work solely with best effort networking.

NexentaEdge prefers deployment with a non-blocking isolated backend storage network. Having a non-blocking multi-switch core enables NexentaEdge's dynamic load-balancing features and aggressive bandwidth utilization. The NexentaEdge nodes may assume that there will be no network congestion as long as NexentaEdge avoids creating congestion on its edge links. Because only NexentaEdge nodes can send traffic to NexentaEdge nodes they can collectively guarantee that there will be no congestion drops. The same would apply to any datacenter cluster where transfers are relatively large, discrete and where the desire is to complete each transfer as rapidly as possible.

A core non-blocking network can be dynamically subdivided into multiple mutually exclusive subnetworks. Each of these subnetworks will have the same non-blocking guarantee available to it. While dynamic updating of the VLAN associated with each port is desirable, it is possible to enforce the logical partitioning strictly on the hosts themselves without requiring any reconfiguration of the switches comprising the nonblocking physical network.

There are only a handful of caveats:
* The underlay network must have adequate unicast forwarding table capacity. This is not an issue for any NexentaEdge backend network. At worst the number of nodes will be measured in the thousands.
* For full support of Rendezvous Groups, the underlay network must have adequate multicast forwarding table capacity. This will generally **not** be available from switches that are being shared with other applications. NexentaEdge will automatically use either unicast Rendezvous Transfers or simulated multicast when this problem must be avoided.
* Host enforced isolation is still vulnerable to a Denial-of-Service attack. The host based virtual switches should be configured to alarm on high volumes of security dropped traffic, and the cloud network administration is expected to deny all access to a source generating this type of traffic.
* If the subset network is not L2 enforced then the overlay network's traffic must be tunneled with underlay network addressing, which is IPv4 in all known cases.

In bare-metal deployments, NexentaEdge prefers L2 isolation of the backend storage network either by QoS enforced L2 VLANs or by assigning entire physical ports to a specific VLAN.
