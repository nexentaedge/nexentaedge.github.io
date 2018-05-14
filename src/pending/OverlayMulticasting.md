---
title: Custom Multicasting via Overlay networks
author: Caitlin Bestler
---
This blog proposes a method of providing push-mode multicasting without requiring any special software on any physical switch. It is compatible with any underlay network that provides at least unicast IPV4 delivery.

This addresses two of the major Replicast network issues, supporting dynamic selection of Rendezvous Groups and working with pre-existing networks with no multicast support.

## TSM and BIER
The Replicast transport protocol used in NexentaEdge relies on a unique multicasting strategy. The sender specifies the set of targets that will receive the transmission.

The conventional protocols for controlling multicast, IGMP for IPV4 and MLD for IPV6, work on the assumption that subscribers individually Join and Leave groups.

This multicast model does not work well for transactional multicasting. We proposed a solution for Transactional Subset Multicasting [^1] to the IETF but didn't get any traction. This was largely because a longer term solution was already on track with BIER[^2], which allows bitmap driven multicasting. BIER is actually a perfect fit for Replicast, other than the fact that we are still years away from seeing switch chips that support BIER.

[^1]: https://tools.ietf.org/html/draft-bestler-transactional-subset-multicast-00
[^2]:https://datatracker.ietf.org/wg/bier/about/

The best interim solution we could offer was pre-provisioning multicast addresses to use as Rendezvous Groups. For each Negotiating Group we simply pre-allocate a Multicast Group for each 2 or 3 member subset of the group.

This is actually a very workable solution, if you are designing a backend storage network to support NexentaEdge. But when the network already exists, particularly when there is already a network administrator in place, we didn't get enthusiastic buy-in to the idea of allocating thousands of multicast addresses for our use. We don't actually require the administrator to provision those addresses, because the backend storage network is isolated from the rest of the network it can use any addressing scheme it wants to without impacting anyone.

But that is not how network administrators were used to viewing problems. And if they seem arbitrary, now think about a network administrator that you can't even talk to - which is what you effectively have with any cloud network (Google Cloud, Azure, AWS, etc.)

For those deployments we end up losing the efficiency of multicast replication.

This proposal for overlay multicasting solves two problems at once:
* It allows implementation of transactional bitmap driven multicasting, allowing low latency push-based multicasting. We would no long rely  on IGMP/MLD and their high-latency Join/Leave transactions.
* It allows tunneling over the underlay network that can take advantage of whatever support the underlay network provides, but can survive on as little as unicast IPV4 support with no IPV6 or multicast support.

Further this overlay multicast can be built into the same Packet Multicasting UDP (PMU) user mode library already designed to streamline transmission through the Linux kernel. PMU is a partial offload strategy, it is not as efficient as DPDK, but is far less model-dependent.

Unlike the PMU or BIER solutions, overlay multicasting enables pushing group membership without requiring any logic to run on any physical switch. However, by pulling some logic from the IETF's TRILL[^3] project we will be able to multicast UDP datagrams to multiple L2 subnets without ever sending any datagram over the same switch-to-switch link more than once.

## The Closed network
The solution described here builds a virtual closed L2 network using whatever underlay network capabilities exist. Better underlay network capabilities yield better results, but the interfaces to the application layer are constant.

This requires a single software module, whether implemented as a user-mode library or as a Container, which is located on each host that requires access to the virtual network. This module must implementing MRouting and Tunneling.

MRouting is multicast-routing of the L2 destination unicast or multicast address to route the datagram to the correct set of MRouters. Replicast nominally uses UDP over IPV6, but the IPV6 address is always derived from the L2 Ethernet address (via link local or unique local addressing) so all routing decisions can be based on the L2 destination.

Tunneling is used to relay to other MRouters when the underlay network cannot directly support UDP/IPV6 delivery with a no-drop traffic class.

This virtual network is a closed network, with no ingress or egress routes. That means that the addresses can be disjoint from the addresses used over the public network. The PMU library does not rely on the Linux stack to route traffic to it, rather the application is explicitly sending a datagram to the Replicast network.

For implementation simplicity the MRouter/Tunneler is the same for both Initiators and Targets, although theoretically an Initiator's module does not have to support reception of multicast addressed messages.

## What Each MRouter Knows
Each MRouter is told the following for itself and all other Target MRouters by some management plane module:
  * Underlay Network IP Address.
  * Underlay Network L2 Address.
  * Overlay Network IPV6 address (which must be compatible with the L2 address).
  * The MRouter Zone that it is part of. This is an identifier of a single underlay L2 network. L2 networks can be identified by L2 protocols such as LLDP but that information is not guaranteed to be available when there is already an Orchestration Layer imposed software defined network. In that case the underlay network IPV4 subnet must be used as proxy identifier.

  Additionally, each Target MRouter tracks the Underlay addressing information for Initiators that have pending requests with the local target. This is the same information as kept about the Targets, but there is no need for a configuration layer to distribute the list of all Initiators each time that list changes. Before a Target has to unicast a response to an Initiator the Initiator is always the unicast source of a request.

## Mrouter Relay
Rather than tunneling to each unicast recipient, the overlay layer relies on MRouters relaying UDP datagrams to other MRouters.

The purpose is simple, rather than sending the same datagram over the same link to two separate unicast addresses, the datagram will be sent over that link once and then relayed by the recipient for both local delivery and then to the second target.

### UDP Relay
If the underlay network provides consistent predictable bandwidth that is neither impacted by other usage nor places other usage at risk the application's UDP datagrams can be tunneled using UDP/TCPV4.

With UDP tunneling the only datagram relay required is when sending from one IPV4 to multiple destinations in a remote IPV4 subnet. The encapsulated datagram simply removes all other targets and sends the encapsulated datagram to one of the MRouters in the target IPV4 subnet.

The receiving MRouter deliver the inner datagram locally and then unicast relays the datagram to the other target. This does require iterative unicast delivery when there are three targets in a single IPV4 subnet. For NexentaEdge this would only occur with Negotiating Groups and only for short unsolicited messages.

The receiving subnet can be configured to directly support the Replicast VLAN in each IPV4 subnet as a closed VLAN. In that case the Negotiating Groups can be configured as multicast groups in that subnet using IGMP/MLD snooping. This would allow directly delivering the encapsulated datagram on the underlay network for each L2 subnet.

### Reliable Tunnel Relay
When the links between IPV4 subnets have inconsistent bandwidth or when the paths between subnets have common links it may be necessary to use a Reliable Connection to achieve reliable tunnel delivery.

By specification the best solution to provide reliable tunneling between MRouters would be SCTP in datagram mode with partial reliability. However, the fact is that you would not need to be using a reliable tunnel if it weren't for software infrastructures that believe TCP/IPV4 networking achieved perfection in the 80s. So to avoid one more hidden gotcha it is probably safer to use extremely generic TCP or TLS tunneling over IPV4. For guaranteed deployability it only makes sense to implement the TCP option first.

Whichever form of reliable connection is used it now makes sense to try to use only a single connection between any two IPV4 subnets. Using fewer connections means improves the probability that the connection's congestion control status is current enough to be useful.

Sparse connections can also create scenarios where a datagram would be tunneled from IPV4 subnet X to IPV4 subnet Y and then relayed to IPV4 subnet Z.

The IETF's TRILL protocols document an algorithm for RBridges to connect to each other over an underlay network. With TRILL the goal is to hide end station L2 MAC addresses from the core network, but there are many similar elements including that the RBridge places the original frame inside of an envelope to transit it over the core network. TRILL already defines an IS-IS routing protocol that determines the optimum path from any RBridge to any RBridge via an availalbe set of adjacent RBridge links. There are open source reference implementations where the IS-IS routing code could be adapted to perform MRouter-to-MRouter tree forwarding tables instead.

[^3]:https://datatracker.ietf.org/wg/trill/charter/

While the underlay network is unlikely to report the topology of the links between IPV4 subnets there are tools that can be used to infer a topology;
* Traceroute, if it is available, will identify common routes.
* Measured ping times can estimate the number of hops between any two subnets.

Within a datacenter it is very unlikely that there will be major restructuring of core routers that occur while instances are running.

# Outbound datagram

## 1) Determine Delivery requirements
* Set of local (same mrouter zone) Targets
* Set of remote MRouters

## 2) Deliver Locally

## 3) Deliver to Remote MRouters
* Via pre-existing All-Custom-MRouters groups.
* Via distribution tree using links/tunnels.
* Via UDP (typically tunneled)

# Received datagram
* Any MRouter Relay?
* Any local delivery?
  * Note unicast source if not already in known target list.
* Any 'here' delivery. Replicast does not need multiple same-host targets for any message.

# Summary
No IETF Multicasting, just IEEE 802.1.
No IGMP/MLD Joins on per-transaction basis.
No massive pre-provisioning of IETF compatible multicast groups.
Just non-blocking switches that we federate.
