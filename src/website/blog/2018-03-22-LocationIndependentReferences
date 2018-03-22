---
title: Location Independent References Using Multicast Groups
author: Caitlin Bestler
---
In the prior blog on NexentaEdge we mentioned that
Chunks were unique and immutable and that Chunk References
merely identify how a Chunk is used to rebuild an object,
but do not specify the locations where the chunk is stored.

This blog will expand on how the Location Independent
References are done.

Actually lots of systems have location-free Chunks
References. What is different about NexentaEdge is
that the location-free Chunk References can specify
a dynamic set of locations that can change without
the add or drop of any storage target.

This is done by hashing the relevant cryptographic
hash (content or name) to a Negotiating Group rather
than to a set of target machines. Each Negotiating
Group has its own multicast group. Storing and
retrieving chunks is negotiated by multicast
requests on that group.

## Get Chunk with CHID
|Initiator|Message|Target Group|
|---|---|---|
|Find Chunk CHID=X|---------->||
||<----------|Each: X available at Y <br> or Not Available|
|Select Target|---------->||
||<-----------|Selected Node At Time: Chunk X|

Payload chunks are found by multicasting a find
request identifying the CHID (Content Hash IDentifirer)
of the desired chunk. This multicast group is hashed
from the CHID ("hash" beign a very fancy mathamatical
term for modding by the number of Negotiating Groups).

Each receiving Target responds to the Initiator with
either an indication that it has Chunk X and could
deliver it at time Y, or that it does not have it.

Once sufficient replies have been received to make
a selection the Initiator multicast what selection
it has made. This is multicast to the same group so
that nodes not selected can cancel tentative resource
reservations.

Lastly the selected storage target delivers the requested
chunk at the specified time. Because this was negotiated,
a network with a non-blocking core can transmit the chunks
at the full rate provisioned for payload transfers.

## Put Chunk With CHID
|Initiator|Message|Target Group|
|---|---|---|
|Put Chunk CHID=X|---------->||
||<----------|Each: When Chunk can be put <br> or Chunk Already Stored|
|Select Targets|---------->|Specifies selected group and when transfer will occur|
|To Selected Group at Time X|--------->|Chunk X|
| |<-------|Each:Acknowledge Receipt|
| |<-------|Each:Acknowledge Chunk Stored|

Of course before we can get Chunk X from somewhere
within a Negotiating Group we have to put it to that
group.

Each member of the group identifies when it could
accept the transfer. The Initiator picks the best
set of targets with an overlapping delivery window
to receive the required number of replicas.

The number of replicas can be reduced when some
replicas already exist. This message can also
complete the transaction if there are already
sufficient replicas.

There is also a nearly identical Replicate Chunk
transaction to test if there are sufficient replicas
of an already existing Chunk and to put this missing
replicas if there is not.

## Get Version Manifest With NHID
|Initiator|Message|Target Group|
|---|---|---|
|Find Version Manifest NHID=X|-------->||
||<--------|Each: VM X with UVID Y  available at Z <br> or Not Available|
|Select Target|-------->||
||<--------|Selected Node At Time: Selected Version Manifest|

Current Version Manifests are found by multicast a
named find requesting identifying the NHID (Name hash
IDentier) of the Version Manifest desired. The Group
is derived from the NHID rather than the CHID.

Each receiving Target responds saying it could deliver
a Version Manifest with NHID X and UVID Y (the unique
version identifier, including the version's timestamp).
Each is the most current version known to that Target.

Once sufficient replies have been collected, the
Initiator selects the Version Manifest it wants,
and multicasts it to the group. Again, this allows
the non-selected targets to release tentative resource
claims.

Lastly the selected storage target delivers the selected
Version Manifest to the Initiator at the negotiated
time at the configured full rate.

## Put Version Manifests
|Initiator|Message|Target Group|
|---|---|---|
|Put Version Manifest NHID=X|---------->||
||<----------|Each: When Chunk can be put |
|Select Targets|---------->|Specifies selected group and when transfer will occur|
|To Selected Group at Time X|--------->|new Version Manifest for NHID X|
| |<-------|Each:Acknowledge Receipt|
| |<-------|Each:Acknowledge Version Manifest Stored|

Putting a new Version Mannifest is nearly identical
to putting a Payload Chunk, except that the Put
request is multicast to the NHID-derived group
(rather than CHID-derived) and that there will
not be a pre-existing Version Manifest with the
same UVID (Unique Version IDentifier).
