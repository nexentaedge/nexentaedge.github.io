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

But that is not how network administrators were used to viewing problems. And if they seem arbitrary, now think about a network administrator that you can't even talk to - which is what you effectively have with any cloud network (Google Cloud, Azure, AWS, etc.).

For those deployments NexentaEddge ends up losing the efficiency of multicast replication.

This proposal for overlay multicasting solves two problems at once:
* It allows implementation of transactional bitmap driven multicasting, allowing low latency push-based multicasting. We would no long rely  on IGMP/MLD and their high-latency Join/Leave transactions.
* It allows tunneling over the underlay network that can take advantage of whatever support the underlay network provides, but can survive on as little as unicast IPV4 support with no IPV6 or multicast support.

While the focus of this blog will be on how these features enable multicasting for NexentaEdge the solution would be of value for any application that communicates with large datagrams which frequently must be delivered to multiple targets. Transfers must be discrete, RAM to RAM. The sender must be able to retransmit the entire datagram should anything go wrong during the transmission. These characteristics should apply to any storage cluster and to many computer clusters.

Further this overlay multicast can be built into the same Packet Multicasting UDP (PMU) user mode library already designed to streamline transmission through the Linux kernel. PMU is a partial offload strategy, it is not as efficient as DPDK, but is far less model-dependent. When a user-mode library cannot be deployed an application layer gateway can be deployed as a container that includes the PMU library.

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

  Additionally, each Target MRouter tracks the Underlay addressing information for Initiators that have pending requests with the local target. This is the same information as kept about the Targets except that the MRouter zone is not needed. More importantly, there is no need for a configuration layer to include the Initiators in the list of known targets. This avoids reconfiguring the cluster every time an Initiator is added or dropped. There is no need to pre-enumerate Initiator's because  an Initiator always is the unicast source of a requesst before a Target has to unicast to it.

## Mrouter Relay
Rather than tunneling to each unicast recipient, the overlay layer relies on MRouters relaying UDP datagrams to other MRouters.

The purpose is simple, rather than sending the same datagram over the same link to two separate unicast addresses, the datagram will be sent over that link once and then relayed by the recipient for both local delivery and then to the second target.

Inter-subnet relay is configured from the set of known MRouter zones. The configuration can optionally include a list of explicit Zone Indirections, each of which specifies:
* A source MRouter Zone.
* A destination MRouter Zone.
* A 'Via' Mrouter Zone. If this zone is already a forwarding target for the datagram then the destination bits for the destination MRouter zone should merely be added to that datagram rather than tunneling to the ultimate destination directly.

While it would be theoretically possible to infer the inter-link topology connecting IVP4 subnets the use of explicit Via declarations avoids having to debug such algorithms. The initial estimate is that when the network topology requires these indirections that this information will be easily obtained from the customer. If this turns out not to be the case there are routing protocols, such as the IS-IS routing algorithm used by RBridges in the IETF's Trill protocols.

It is worth noting that the Subnet Via declarations are an optimiztion. The overlay scheme will work even if the optimal Via declarations are not created. Further they are not needed for any non-blocking core or when the subnets are all connected directly to each other or via a set of core routers implementing a star or star-like topology. More complex topologies, such as rings, do not occur by accident. When they are present there will be someone who knows what the ring topology is.

### UDP Relay
If the underlay network provides consistent predictable bandwidth that is neither impacted by other usage nor places other usage at risk the application's UDP datagrams can be tunneled using UDP/TCPV4.

With UDP tunneling the only datagram relay required is when sending from one IPV4 to multiple destinations in a remote IPV4 subnet. The encapsulated datagram simply removes all other targets and sends the encapsulated datagram to one of the MRouters in the target IPV4 subnet.

The receiving MRouter deliver the inner datagram locally and then unicast relays the datagram to the other target. This does require iterative unicast delivery when there are three targets in a single IPV4 subnet. For NexentaEdge this would only occur with Negotiating Groups and only for short unsolicited messages.

The receiving subnet can be configured to directly support the Replicast VLAN in each IPV4 subnet as a closed VLAN. In that case the Negotiating Groups can be configured as multicast groups in that subnet using IGMP/MLD snooping. This would allow directly delivering the encapsulated datagram on the underlay network for each L2 subnet.

### Reliable Tunnel Relay
When the links between IPV4 subnets have inconsistent bandwidth or when the paths between subnets have common links it may be necessary to use a Reliable Connection to achieve reliable tunnel delivery.

By specification the best solution to provide reliable tunneling between MRouters would be SCTP in datagram mode with partial reliability. However, the fact is that you would not need to be using a reliable tunnel if it weren't for software infrastructures that believe TCP/IPV4 networking achieved perfection in the 80s. So to avoid one more hidden gotcha it is probably safer to use extremely generic TCP or TLS tunneling over IPV4. For guaranteed deployability it only makes sense to implement the TCP option first.

Whichever form of reliable connection is used it now makes sense to try to use only a single connection between any two IPV4 subnets. Using fewer connections means improves the probability that the connection's congestion control status is current enough to be useful.

# Tracing a Request and Response
This section will explore how the PMU library would deliver a multicast request and then how a recipient would send a unicast response.

## Send Request
The send request specifies the multicast group to receive the request (A Negotiating Group with the Replicast protocol used by NexentaEdge).

This datagram has an IPV6 multicast address as the target, and the L2 multicast address mapped from it.

The PMU MRouter must determine the set of targets that the group addresses, and the MRouter for each MRouter Zone that will be used as the target.

When there is an explicit subnet topology, either from Reliable Tunnels or by explicit configuration, a closer subnet may be used to relay to a more distant subnet. This will reduce the number of mrouters directly targeted.

For each directly addressed mrouter, a datagram will be generated to that target. Only the relevant target bits in the multicast address will be included in address sent to the remote mrouter.

When multiple datagrams must be sent they will be sent back-to-back without any delay.

## On MRouter Receipt
When an MRouter receives a tunneled datagram it must forward it according to the bits set in the bitmap portion of the target address. This may include:
* Same-host delivery, via the PMU ring.
* Same-subnet delivery, via the local underlay network. This will be via UDP/IPV4 by default, but could be via IPb^ unicast or multicast if the underlay network supports it.
* Different subnet: the tunneled datagram is forwarded to the remote subnet with the local deliveries removed from the target bitset.

Additionally the addresses of a unicast source are noted for eventual use for the unicast response.

## Target Sends Unicast Response
When the target application layer submits a unicast response as an unsolicited datagram. The destination mrouter is mapped from the unicast destination, and the datagram is encapsulated for delivery over the underlay network to that mrouter.

## Rendezvous Transfers
NexentaEdge requires sending chunks against a bandwidth reseervation. These can either be to a multicast address, when putting a chunk, or unicast address when fetching a chunk.

The PMU library has a method that allows the application layer to submit an entire chunk in one call. The library then paces transmissions of the individual packet at a rate just below the capacity of the network. This keeps the in-networking buffering at 0 or 1 frames to ensure low latency for unsolicited frames. If a full chunk were transmitted at wire rate it would be possible for several frames to accumulate in switch buffers, resulting in poor latency on unsolicited datagrams that had the misfortune of arriving after the chunk.

When processing these whole chunk requests the PMU library will determine the required mrouting and envelope for the entire chunk, and execute the frame-by-frame transmissions at the desired pace.

# Summary
No IETF Multicasting, just IEEE 802.1.
No IGMP/MLD Joins on per-transaction basis.
No massive pre-provisioning of IETF compatible multicast groups.
Just non-blocking switches that we federate.
