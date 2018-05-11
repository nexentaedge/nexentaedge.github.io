---
title: Custom Multicasting via Overlay networks
author: Caitlin Bestler
---
## TSM and BIE

## Overlay Networking solution

### Container or Library solution

## What Each MRouter Knows
* How to send datagrams to other Mrouters.
* What end stations it can directly deliver to and how.

MRouter Zone = ID + {MRouter ID}
MRouter = ID + Zone ID + Overlay IP Address
Optional Explicit Reliable Tunnel list
Optional All-Mrouter multicast address

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
* Any 'here' delivery. Replicast does not need multiple same-host targets for any message.

# Summary
No IETF Multicasting, just IEEE 802.1.
No IGMP/MLD Joins on per-transaction basis.
No massive pre-provisioning of IETF compatible multicast groups.
Just non-blocking switches that we federate.
