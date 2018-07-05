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

Things, however, get complex once L3 is introduced. Now each multicast router (mrouter) needs to figure out the set of mrouters that each multicast datagram is to be forwarded to. The problem? Multicast L3 addresses are not scoped in any way. Every multicast address is equally available to all multicast routers.

That is the last thing a network administrator wants when supporting multiple tenants. If Tenant X only has nodes off of two switches then Tenant X traffic should not be pesting any of the other switches in the data center.

At the L2 layer, VLANs can easily scope the set of switches where listeners **might** exist. This also allows easy management of the multicast address space by partitioning it into VLAN specific address spaces.

IP Addresses unfortunately do not directly represent VLANs except by assigning separate subnets to each VLAN. Those are separate **unicast** address ranges to each VLAN. With L3 glasses on the multicast address space is totally flat and painfully global.

If your ISP re-routes your last mile through a different laser transmitter only a handful of routers within its infrastructure must be informed. But if you subscribe to a multicast address, someone has to figure out how to tell every mrouter on the planet that **might** be transmitting that address.

This is why multicast support on the Internet backbone is close to non-existent.

Routing of unicast addresses is relatively simple. The largest possible unicast prefix directs the datagram to the ISP, which can then apply more detailed routes to direct it to a specific geographic location and finally to the correct building or residence. A multicast address, however, can literally be directed to any edge router on the entire planet.

Or to any edge router on the entire planet where the ISP supports multicasting.

I think you see why very few ISPs support multicasting. Supporting unicast router is simpler, and mandatory. You can't claim to provide an Internet service and not support unicast.

## Multicasting Is Different for Datacenter Apps
Datacenter multicasting does not have the same needs as conventional wide-area multicasting.

Traditional multicast protocols have this strange model where the publisher does not know who is receiving the data. This is a relic of early Internet thinking that multicast would be used for tailored broadcasting. Subscribers would join and leave a multicast already in progress without having to inform the sender.

This model has not been widely deployed. One of the modern success stories cited by multicast champions is distribution of financial trading data. This is a very good fit for unreliable delivery because all information is updated periodically anyway.  Immediate retransmission for reliable delivery does not make sense in that environment. But the entities transmitting this data do know who their paid subscribers are.

The model for datacenter multicasting is to specify the recipients of a message as a precise subset of an enumerated set of cluster members. More importantly the precise set of nodes that should receive a given set of data to be processed is being driven by a master scheduler, not by the interest of the subscribers. The master scheduler needs to get data to a set of nodes that will all process it. But those nodes were not known at the start of the job, it has been influenced by when nodes have finished prior work. Under this model there is a finite set of possible targets, with a subset being chosen for a given distribution of data on a dynamic basis. That choice is made at the publishing end, not by the subscribers.

Examples include:
* Storage Clusters which must deliver multiple replicas of the same content to different storage targets.
* Multi-stage distributed compute jobs where the output of slice X of Stage N processing must be consumed by multiple nodes of Stage N+1 processing.

The BIER (Bit Indexed Explicit Replication, https://datatracker.ietf.org/wg/bier/about/) fits this model. The solution proposed here will work with BIER enabled networks once they are finally deployed and if cloud providers choose to support them. This solution works with unicast messaging alone. Any method can be used to encode the destination bitmap, including being BIER compatible.

## Overlay Relay
The fundamental strategy for overlay multicast is to relay the packets with each node also acting as an mrouter.

To reach all destination nodes you first partition the bitmap into a retained portion and a nearly equally sized subset that will be delegated to one member of that group.

The datagram is then sent to one member of that group with the reduced set of targets.

Those targets are then removed from the set of targets.

This process continues on both this and the addressed node until there are no bits left to be delivered.

## Optimizing The Relay Tree
Of course it is very desirable to be topology aware when dividing the bitmap in half. The nodes assigned to one partition should have the highest affinitiy with each other.

Affinity is preferably determined by the LLDP identifier of the directly attached switch. Of course cloud providers that are militantly insisting that they provide an L3-only service are unlikely to expose LLDP messages to the containers. When LLDP identifiers are not available the IP subnet is used as the best available affinity.

It is also desirable to determine when affinity groups are reached via other affinity groups. If datagrams for Affinity Group Y go through a switch supporting Affinity Group X then it makes sense to include all destination bits for Groups X and Y in the same partition and to send the datagram to a member in Group X.

### Nodes pre-identified
Under this strategy each node is a mrouter. All nodes are identified prior to being assigned a bit number in the bitmap.

There could also be a utility mrouter which is presumably part of the router that is the ingress to the subnet.

The set of mrouters is identified by some other subsystemm, such as a Keep-alive system. The PMU libraries expect to receive a full roster of all cluster members, including:
* Unique L2 address for each node.
* unique IPv4 address for the PMU mrouter associated.
* An identifier of the "local delivery zone" that this mrouter is included in. This may be the IPV4 subnet that is common for a set of mrouters, or the LLDP identifier of a common switch that they are all connected to.

###  Using L2 Multicasting
If permitted, delivery can be further optimized by using L2 multicasting within each subnet.


Using L2 forwarding rules to optimize tail of payload delivery.

### Multicasting to Any Subset of Pre-identified Group
The custom multicasting forwarding rules support delivery of datagrams to any subset of pre-enumerated groups. These groups, known as Negotiating Groups in the NexentaEdge Replicast protocol, have a small enumerated roster that changes infrequently (in response to a server add or drop).

Each L2 multicast address is parsed as:
* N (typically 11) bit leading Group Number. This supports up to 2048 groups.
* M bits marking the set of targets within the Group that the datagram should be delivered to. For Replicast this is 12 bits. The semantics are identical to BIER bitmap delivery, except that the bitmap is encoded in the traditional L2 multicast address to allow efficient forwarding with existing switch chips.

The roster of each group is specified when the total cluster membership is distributed. It is also possible to build these tables by IGMP and/or MLD snooping within each local delivery area.

## Why Traffic Shaping is Required
Using a tunnel envelope of UDP/IPV4 keeps tunnel management simple. Each datagram can be encapsulated or decapsulated without complex state management.

However, this implicitly means that the hosts are assuming that their compliance with a provisioned bandwidth is sufficient to avoid network congestion. Because one datagram may be relayed two or three times **any** risk of congestion drops is compounded. Congestion-free delivery is essential.

Without some form of traffic shaping over the underlay network congestion-free delivery is not a safe assumption. It is also an improper assumption to make in that the risks are being shared with other traffic. The congestion caused may drop frames from other flows just as likely as from the application that decided to bypass normal congestion control.

IETF standards require UDP transmitters to implement TCP Friendly Rate Control, which can be done by:
* Limiting UDP bandwidth to a trickle. This is used by protocols such as DNS.
* Limiting UDP bandwidth to a rate below the bandwidth that was reserved for this traffic.
* By implementing a dynamic congestion control which is fair to all other traffic sharing the traffic class running TCP congestion control.

The Replicast storage transport protocol uses pacing of new transactions to limit the unsolicited UDP bandwidth and explicit reservations against a provisioned rate to throttle payload bandwidth. Different applications can use their own solutions.

# Summary
The options described here allow multicasting to be implemented over any IPV4 network. Multicasting is done over a virtual closed L2 subnet that is implemented by a gunneling layer that provides for multicast optimization of delivery without requiring multicast support from the underlay network.

Further, the definition of multicast groups can be adapted to cluster-friendly push models rather than being restricted to the classic subscription model.
