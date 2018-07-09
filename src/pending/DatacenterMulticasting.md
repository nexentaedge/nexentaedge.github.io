---
title: Datacenter Multicasting
author: Caitlin Bestler
---
Multicast messaging should be a powerful tool for distributed applications in Datacenter clusters. The L2 definition of multicasting, in particular, is very well suited to datacenter communications:
* Maximum one-way transit times within a datacenter are relatively short. All recipients will either receive or not receive the message at about the same time, which is very quickly.
* Congestion Control within any L2 subnet is an easily solved problem. Brute-force traffic shaping can reserve bandwidth for a specific traffic class. Those options have been available for decades. Methods that preserve bandwidth while protecting traffic were specified with the Datacenter Bridging (DCB) enhancements. With these L2 traffic shaping features most applications can achieve drop-free delivery with simple transmit pacing.
* There are several applications where multicast enables send-once-receive-many messaging to get more real work done with fewer network resources.

This is because for any single switch, supporting L2 multicasting is simple:
* A multicast forwarding rule maps the L2 multicast address to the set of ports that each datagram must be delivered upon. A switch simply enqueues the multicast frame to the targeted set of ports and releases the frame once it has been transmitted on all of them. The only extra work for delivering to N ports rather than 1 port is keeping track of each port's delivery status.
* Learning multicast forwarding is easy within an L2 subnet which already has non-looping delivery of frames. The port where the "Join" request is heard is the one where that group's frames need to be delivered. Whatever variant of spanning tree is in use has already done all the heavy lifting.

Things, however, get complex once L3 is introduced. Now each multicast router (mrouter) needs to figure out the set of mrouters that each multicast datagram is to be forwarded to.

The problem? Multicast L3 addresses are not scoped in any way. Every multicast address is equally available to all multicast routers.

That is the last thing a network administrator wants when supporting multiple tenants. If Tenant X only has nodes off of two switches then Tenant X traffic should not be pesting any of the other switches in the data center.

At the L2 layer, VLANs can easily scope the set of switches where listeners **might** exist. This also allows easy management of the multicast address space by partitioning it into VLAN specific address spaces.

IP Addresses unfortunately do not directly represent VLANs except by assigning separate subnets to each VLAN. Those are separate **unicast** address ranges to each VLAN. With L3 glasses on the multicast address space is totally flat and painfully global.

If your ISP re-routes your last mile through a different laser transmitter only a handful of routers within its infrastructure must be informed. But if you subscribe to a multicast address, someone has to figure out how to tell every mrouter on the planet that **might** be transmitting that address to you.

This is why multicast support on the Internet backbone is close to non-existent.

Routing of unicast addresses is comparatively simple. The largest possible unicast prefix directs the datagram to the ISP, which can then apply more detailed routes to direct it to a specific geographic location and finally to the correct building or residence. Any multicast address, however, can literally be directed to any edge router on the entire planet. Subscribers can appear anywhere. The publisher can be anywhere.

I think you see why very few ISPs support multicast. Supporting unicast is simpler, and mandatory. You can't claim to provide an Internet service without unicast support.

## Multicasting Is Different for Datacenter Apps
Datacenter multicasting does not have the same needs as conventional wide-area multicasting.

Traditional multicast protocols have this strange model where the publisher does not know who is receiving the data. This is a relic of early Internet thinking that multicast would be used for tailored broadcasting. Subscribers would join and leave a multicast already in progress without having to inform the sender.

This model has not been widely deployed. One of the modern success stories cited by multicast champions is distribution of financial trading data. This is a very good fit for unreliable delivery because all information is updated periodically anyway.  Immediate retransmission for reliable delivery does not make sense in that environment. But the entities transmitting this data do know who their paid subscribers are.

The model for datacenter multicasting is to specify the recipients of a message as a precise subset of an enumerated set of cluster members. More importantly the precise set of nodes that should receive a given set of data to be processed is being driven by a master scheduler, not by the interest of the subscribers. The master scheduler needs to get data to a set of nodes that will all process it. But those nodes were not known at the start of the job, it has been influenced by when nodes have finished prior work. Under this model there is a finite set of possible targets, with a subset being chosen for a given distribution of data on a dynamic basis. That choice is made at the publishing end, not by the subscribers.

Examples include:
* Storage Clusters which must deliver multiple replicas of the same content to different storage targets.
* Multi-stage distributed compute jobs where the output of slice X of Stage N processing must be consumed by multiple nodes of Stage N+1 processing.

The BIER (Bit Indexed Explicit Replication, https://datatracker.ietf.org/wg/bier/about/) fits this model. The cluster is pre-enumerated. Each member is pre-assigned a bit index, and this information is shared by all nodes.

The interfaces proposed here will map directly to BIER once those networks are finally deployed and if cloud providers choose to expose those capabilities. This solution implements the API with overlay networking using only unicast messaging on the underlay network.

## Overlay Relay
The fundamental strategy for overlay multicast is to relay the packets with each node also acting as an mrouter:
* To reach all destination nodes you first partition the bitmap into a retained portion and a nearly equally sized subset that will be delegated. That subset will be retained in the message delivered to one member of that group.

* The datagram is then sent to the selected member of that group with the reduced set of targets.

* Those targets are then removed from the set of targets.

* This process continues on both this and the addressed node until there are no bits left to be delivered.

Of course it is very desirable to be topology aware when dividing the bitmap in half. The nodes assigned to one partition should have the highest affinity with each other.

Affinity is preferably determined by the LLDP identifier of the directly attached switch. Of course cloud providers that are militantly insisting that they provide an L3-only service are unlikely to expose LLDP messages to the containers. When LLDP identifiers are not available the IP subnet is used as the best available affinity.

The Affinity Grouup for each member of the cluster is declared when that node is assigned a bit index in the bitmask. Therefore the application layer can actually choose any method for assigning affinity that it desires. Techniques such as measuring round-trip times can fairly accurately measure a network topology even if it officially opaque.

It is also desirable to determine when affinity groups are reached via other affinity groups. If datagrams for Affinity Group Y go through a switch supporting Affinity Group X then it makes sense to include all destination bits for Groups X and Y in the same partition and to send the datagram to a member in Group X.

Each node is also an mrouter. All nodes are identified prior to being assigned a bit number within the cluster.

There can be multiple clusters. Each identifies:
* A nominal IP address that is used as the initial destination for datagrams sent to the cluster.
* One or more nodes: including:
  * Bit number.
  * Unicast IP Address.
  * Affinity.

Clusters are identified and enumerated by another sub-system, frequently a Keep-alive system.

## Datagram Filtering
Overlay Multicast is implemented with a datagram filter on each cluster node. This is best integrated a direct access interface such as PF-Ring or DPDK.

This filter will process each sent or received datagram which has the configured UDP destionation port number and is L3 addressed to either:
* The cluster designated unicast IP address.
* This node's unicast IP address as specified in a cluster definition.

Each datagram needs to be a UDP datagram complete with an overlay multicast header at the start of the UDP payload. This header specifies:
   * The Destination Set: BIER-compatible encoding with SI, Bitstring and Bitstring Length.
   * Application source/destination ports.

The filtered datagram may be delivered and/or retransmitted immediately to a subset of the received destinations.

Additional transmissions with successively smaller subsets of the original destination set. May be scheduled after the initial transmission completes.

* to be discussed: tradeoff between jamming overlay relay versus allowing unsolicited packets first. *

### Multicasting to Any Subset of Pre-identified Group
The custom multicasting forwarding rules support delivery of datagrams to any subset of pre-enumerated groups.

These multicast delivery options are enumerated as:
* Multicast IP address.
* Set of targets within the cluster that will be addressed.

Note that if the packet filter has access to multiple independent network interfaces it may immediately deliver as many destinations as possible on each of those ports. This would occur when the datagram filter had been implemented on an edge switch. Of course network administrators who would not enable multicast for an application are unlikely to permit that application to load software onto their network equipment.

An example is illustrated in the folloowing diagram:
![OverlayMulticastingExample](OverlayMulticast.png)

A sender wishes to reach A thru M. A and B share the senders affinity. E, F and G share an affinity. G and H are a third affinity, but one reached via E, F and G's affinity.

Similarly H, I and J are in an affinity group, which is path to the affinity group holding K, L and M.

In the diagram the target set remaining for each forwarded instance of the datagram is shown.

In this example all nodes are reached within 4 transmissions. No inter-affinity link is traversed more than once. This is not as efficient as true multicast would have been, but it is far more efficient than having the sender iteratively unicast to all the destinations.

## Recurring Themes
The datagram forwarding strategies here are similar to, but different, than the methods for relaying chunks between federated NexentaEdge clusters.

Neither strategy requires a definitive network topology be fully enumerated.

Linking federated clusters is done over reliable fixed tunnels. There is a single entry point to each cluster (it probably is a virtual IP address which will migrate if necessary, but it is treated as a single entry point).

In contrast, Overlay Multicasting can use any node within an affinity-group as the entry point. The fact that a single multicast delivery may require retransmitting the same datagram multiple times makes it even more important that the probability of congestion drops be as close to zero as possible.

Forwarding between clusters without an explicit topology avoids loops by not transferring duplicate chunks to a cluster that already has a chunk. This contrasts with the spanning tree algorithm for avoiding loops by deactivating some links.

Overlay multicasting avoids loops by trimming the destination bitmask by at least one with each transmission. Like spanning tree, it is a very simple step. But the result is important for avoiding write amplification through overlay networking. That is why care is taken to partition the destination bitmask so that the inter-affinity links are only traversed once. These are the links most prone to congestion.

###  Using L2 Multicasting
The cluster may support any number of native L2 multicast addresses. For each the following is specified:
* The L2 multicast address.
* The destination bitmask that this address will reach.

If declared these addresses may be used to resolve multiple destination bits in a single native multicast transmission. However, network administrators reluctant to expose any L2 services are unlikely to provision these L2 multicast addresses.

## Why Traffic Shaping is Required
Using a UDP tunnel envelope keeps tunnel management simple. Each datagram can be encapsulated or decapsulated without complex state management.

However, this requires the hosts comply with a provisioned bandwidth or otherwise avoid network congestion. Because one datagram may be relayed two or three times **any** risk of congestion drops is compounded. Congestion-free delivery is essential.

Without some form of traffic shaping over the underlay network congestion-free delivery is not a safe assumption. It is also an improper assumption to make in that the risks are being shared with other traffic. The congestion caused may drop frames from other flows just as likely as from the application that decided to bypass normal congestion control.

IETF standards require UDP transmitters to implement TCP Friendly Rate Control, which can be done by:
* Limiting UDP bandwidth to a trickle. This is used by protocols such as DNS.
* Limiting UDP bandwidth to a rate below the bandwidth that was reserved for this traffic.
* By implementing a dynamic congestion control which is fair to all other traffic sharing the traffic class running TCP congestion control.

The Replicast storage transport protocol uses pacing of new transactions to limit the unsolicited UDP bandwidth and explicit reservations against a provisioned rate to throttle payload bandwidth. Different applications can use their own solutions.

# Summary
The options described here allow multicasting within an enumerated set of destinations to be implemented over any IP network. Packets are multicast to any subset of the cluster identified in the packet header. No use of multicast addresses, L2 or L3, is required.
