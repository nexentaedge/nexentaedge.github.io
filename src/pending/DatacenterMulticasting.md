---
title: Datacenter Multicasting
author: Caitlin Bestler
---
Multicast messaging should be a major tool when designing distributed applications to run in Datacenter clusters. The L2 definition of multicasting, in particular, is very well suited to datacenter communications:
* The maximum one-way transit time within a datacenter is relatively short. All recipients will either receive or not receive the message at about the same time, which is very quickly.
* Congestion Control within any L2 subnet is an easily solved problem. Brute-force traffic shaping where a portion of the capacity is simply reserved for a specific traffic class has been available for decades. Methods that preserve bandwidth while protecting traffic were specified with the Datacenter Bridging (DCB) enhancements. Most applications will be able to achieve drop-free delivery with simple transmit pacing and L2 traffic shaping.
* There are several applications where send-once-receive-many allows the same network to get more real work done with fewer network resources.

This is because for any single switch, supporting L2 multicasting is simple:
* A multicast forwarding rule maps the L2 multicast address to the set of ports that each datagram must be delivered upon. A switch simply enqueues the multicast frame to that set of ports and releases it once it has been transmitted on all of them. The only extra work for delivering to N ports rather than 1 port is keeping track of each port's delivery status.
* Learning multicast forwarding is easy within an L2 subnet which already has non-looping delivery of frames. The port where the "Join" request is heard is the one where that group's frames need to be delivered. Whatever variant of spanning tree is in use has already done all the heavy lifting.

Things, however, get complex once L3 is introduced. Now each multicast router (mrouter) needs to figure out the set of mrouters that each multicast datagram is to be forwarded to. The problem? Multicast L3 addresses are not scoped in any way. Every multicast address is equally available to all multicast routers.

At the L2 layer, VLANs can easily scope the set of switches where listeners **might** exist. This also allows easy management of the multicast address space by partitioning it into VLAN specific address spaces.

IP Addresses unfortunately do not directly represent VLANs except by assigning separate subnets to each VLAN. Those are separate **unicast** address ranges to each VLAN. With L3 glasses on the multicast address space is totally flat and painfully global.

If your ISP re-routes your last mile through a different laser transmitter only a handful of routers within its infrastructure must be informed. But if you subscribe to a multicast address, someone has to figure out how to tell every mrouter on the planet that **might** be transmitting that address.

This is why multicast support on the Internet backbone is close to non-existent.

Routing of unicast addresses is relatively simple. The largest possible unicast prefix directs the datagram to the ISP, which can then apply more detailed routes to direct it to a specific geographic location and finally to the correct building or residence. A multicast address, however, can literally be directed to any edge router on the entire planet.

Or to any edge router on the entire planet where the ISP supports multicasting.

I think you see why very few ISPs support multicasting. Supporting unicast router is simpler, and mandatory. You can't claim to provide an Internet service and not support unicast.

## Datacenter Multicasting Is Different
Datacenter multicasting does not have the same needs as conventional wide-area multicasting.

Traditional multicast protocols have this strange model where the publisher does not know who is receiving the data. This is a relic of early Internet thinking that is not widely deployed. One of the modern success stories cited by multicast champions is distribution of financial trading data. This is a very good fit for unreliable delivery because all information is updated periodically anyway. Immediate retransmission for reliable delivery does not make sense in that environment. But the entities transmitting this data do know who their paid subscribers are.

The model for datacenter multicasting is to specify a precise subset of an enumerated set of cluster members as recipients. Examples include:
* Storage Clusters which must deliver multiple replicas of the same content to different storage targets.
* Multi-stage distributed compute jobs where the output of slice X of Stage N processing must be consumed by multiple nodes of Stage N+1 processing.

Delivery to an enumerated subset is the model for the IETF's new BIER protocols. The solution described here will be happily implemented on BIER enabled networks, once they show up sometime next decade. Until then an overlay strategy is compatible with current switch capabilities.

The links/tunnels between the edge switches get the multicast datagram to the correct set of switches. That is the overlay network. The edge switches deliver to targets directly connected to them using the underlay network.

Underlay network L2 multicasting can be leveraged when available. Iterative unicast messaging can be used for local delivery otherwise. Even when forced to use iterative unicast last-hop delivery the overlay network deliveries between switches are limited to a single copy of each multicast datagram.

## UDP Deployment
The simplest deployment of overlay tunneling features a host-resident "mrouter" on each cluster host:
* in the simplest deployment any user-mode library supporting a direct network access API can be extended to do overlay network mrouting and encapsulation/decapsulation. In NexentaEdge deployment we have a PMU library, for Packet Multicast UDP, that uses PF_Ring Packet MMAP sockets. When an Interface is opened for UDP/IPV4 tunneling the library routine has been extended to do these extra steps. The IPV4 address and subnet and subnet must be assigned by a IP Address Management (IPAM) system. An expected bandwidth must be provisioned telling each end host how much traffic it is allowed to generate while expecting drop-free delivery.
* Each "mrouter" accepts packets delivered from peer mrouters which it delivers locally, and optionally forwards to other "nearby" mrouters. This is based on a custom mapping of multiast addressing which will be described in the next section.
* Each outbound datagram is sent at most once to a peer mrouter in each "local delivery zone" (typically a subnet), based on the unicast and multicast forwarding tables.

## Custom Forwarding Rules
Whether implemented as a distinct Kubernetes Pod or as an enhanced usermode library, the mrouter will have to implement the overlay networks custom forwarding rules.

### MRouters pre-identified
The set of mrouters is identified by some other subsystemm, such as a Keep-alive system. The PMU libraries expect to receive a full roster of all cluster members, including:
* Unique L2 address for each node.
* unique IPv4 address for the PMU mrouter associated.
* An identifier of the "local delivery zone" that this mrouter is included in. This may be the IPV4 subnet that is common for a set of mrouters, or the LLDP identifier of a common switch that they are all connected to.

### Multicasting to Any Subset of Pre-identified Group
The custom multicasting forwarding rules support delivery of datagrams to any subset of pre-enumerated groups. These groups, known as Negotiating Groups in the NexentaEdge Replicast protocol, have a small enumerated roster that changes infrequently (in response to a server add or drop).

Each L2 multicast address is parsed as:
* N (typically 11) bit leading Group Number. This supports up to 2048 groups.
* M bits marking the set of targets within the Group that the datagram should be delivered to. For Replicast this is 12 bits. The semantics are identical to BIER bitmap delivery, except that the bitmap is encoded in the traditional L2 multicast address to allow efficient forwarding with existing switch chips.

The roster of each group is specified when the total cluster membership is distributed. It is also possible to build these tables by IGMP and/or MLD snooping within each local delivery area.

### Local Delivery
Delivering received datagrams within the local delivery zone is done with the PF-Ring for the very local target and native networking for other targets in the same local delivery zone.

Delivering to other local destinations can be done by iterative unicasting when the local network provider has completely blocked multicast support, or by L2 multicast confined to the local delivery area when that option is available.

Multicast membership for L2 delivery may be achieved via native network IGMP or MLD snooping of explicit Join/Leave messages or by pushing the multicast membership directly when possible.

### Remote delivery
When sending a datagram to peer Mrouters the local Mroouter must determine the optimal set of mrouters to forward the encapsulated datagram to. Because we are tunneling using UDP we can always deliver the datagram directly to each target.

Unfortunately a Pod is not provided with authoritative information on the  cluster's network topology. We do not know the set of mrouters that are connected directly to the same switch. However, there are two easily available proxies that enable finding most instances where sending datagrams to a pair of addresses will end up serializing them over an intermediate link:
* The IPV4 subnet that each mrouter is part of. If mrouters are in different subnets they cannot talk to each other directly even if they actually are physically adjacent.
* The LLDP (Link Layer Discovery Protocol) identifier of the first hop switch. If this information is available to the hosts then it is a very direct indication of when different hosts are attached to the same switch. LLDP is an example of one the many uses of multicasting deployed successfully and largely invisibly in modern Ethernet networks. Originally designed for VOIP phones it is now also used by the DCB (Datacenter Bridging) protocols to discover and negotiate L2 traffic shaping.

### Exploiting Existing Switch Chip Multicast forwarding
It is desirable to use the native multicast forwarding table features of existing switches. When native multicast forwarding has been enabled the mrouter can use the native L2 multicast address for local delivery.
interface.

Native multicast forwarding tables may be built using any of the following techniques:
* By pushing the membership directly to switch firmware through a software interface. Unfortunately, most switches lack support for limited authorization. Anyone allowed to change anything will be allowed to change everything. Network administrators will not be comfortable with this.
* Using native IGMP/MLD Join/Leave requests to manipulate local tables. Explicit forwarding rules prevent the Join/Leave requests from being forwarded to other switches. Building these forwarding tables may be done when the group roster is set or when usage of the group begins. Roster time builds will probably limited to subsets with a limited number of selected members as that the existing forwarding chips are not designed to support the number of multicast addresses that full pre-enumeration would require. Dynamic building of native multicast forwarding rules will probably have to use iterative unicasting of the first few datagrams of each chunk.
* Using application specific snooping to discover the groups more efficiently. For example, NexentaEdge multicast Accept Messages for each transaction which identifies the Negotiating Group, the Rendezvous Group to be used as well as the selected members and the time and length of each rendezvous transfer.

## Why Traffic Shaping is Required
Using a tunnel envelope of UDP/IPV4 keeps tunnel management simple. Each datagram can be encapsulated or decapsulated without complex state management.

However, this implicitly means that the hosts are assuming that their compliance with a provisioned bandwidth is sufficient to avoid network congestion. Without some form of traffic shaping over the underlay network this is not a safe assumption. It is also an improper assumption that may impose congestion drops on non-cluster traffic over shared inter-switch links.

IETF standards require UDP transmitters to implement TCP Friendly Rate Control, wich can be done by:
* Limiting UDP bandwidth to a trickle. This is used by protocols such as DNS.
* Limiting UDP bandwidth to a rate below the bandwidth that was reserved for this traffic.
* By implementing a dynamic congestion control which is fair to all other traffic sharing the traffic class running TCP congestion control.y

# Alternate Implementations
This section will describe other possible implementations.

## Pod Implementation
Rather than relying on the PMU library, the same UDP/IPV4 tunneling can be implemented by a Pod providing the same interfaces as an OpenVswitch software switch. This pod could even make use of the same switch device kernel module used by OpenVswitch.

While using a distinct pod would provide for more flexible deployment it would increase latency on all packets transmitted or received.

## Reliable Connection tunnels
When no rate expectation is available it will be necessary to use reliable connections to tunnel between mrouters. This has several implications:
* There is more state associated with each tunnel, making it preferable to create at most one connection between any pair of local delivery zones.
* More buffering will be consumed because the tunnel will have to track completion of each forwarded datagram. It cannot complete transmission of a datagram until it has been acked through the reliable tunnel or the connection has been declared dead.
* Feedback should be generated to upper layers on pacing of tunnel from the transport layer. With this feedback the application layer will be able to automatically adapt to whatever network bandwidth is available.

# Summary
The options described here allow multicasting to be implemented over any IPV4 network. Multicasting is done over a virtual closed L2 subnet that is implemented by a gunneling layer that provides for multicast optimization of delivery without requiring multicast support from the underlay network.

Further, the definition of multicast groups can be adapted to cluster-friendly push models rather than being restricted to the classic subscription model.
