---
title: Location Independent References
author: Caitlin Bestler
tags: [CCOW,Negotiating Group,Version Manifest]
---
In the prior blog on NexentaEdge we mentioned that
Chunks were unique and immutable and that Chunk References
merely identify how a Chunk is used to rebuild an object,
but do not specify the locations where the chunk is stored.

This time we will expand on how the Location Independent
References are done.

The Version Manifest specifies a specific version of an object. It specifies the metadata for the version, including a few mandatory fields, and a series of Chunk References which reference the payload chunks.

A typical Chunk Reference contains:
* The CHID of the referenced chunk.
* The Logical Offset of the Chunk in the object versin.
* The Logical Length of the decompressed payload.

What it does not specified is any locations where the replicas are held. This means that the content can be migrated either for maintenance or load-balancing purposes without updating the Version Manifest.

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
|From|To|Message|
|----|---|---|
|Initiator|Target Group|Find Chunk With CHID=X|
|Each in Target Group|Initiator|X Available at Y <br>or Chunk Not Stored|
|Initiator|Target Group|Select specific Target at Time T|
|Selected Target|Initiator|Chunk X|

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
|From|To|Message|
|----|---|---|
|Initiator|Target Group|Put Chunk With CHID=X|
|Each in Target Group|Initiator|Available at Times Y-Z <br>or Chunk Already Stored|
|Initiator|Target Group|Select specific Targets at Time T|
|Initiator|Selected Targets|At time T:Chunk X|
|Each Target|Initiator|Receipt Ack|
|Each Target|Initiator|Chunk Saved Ack|

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
|From|To|Message|
|----|---|---|
|Initiator|Target Group|Find Version Manifest With NHID=X|
|Each in Target Group|Initiator|Version Manifest X with UVID Y Available at Z <br>or No Version Stored Here|
|Initiator|Target Group|Select specific Target at Time T|
|Selected Target|Initiator|Version Manifest|

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
|From|To|Message|
|----|---|---|
|Initiator|Target Group|Put Versio Manifest With NHID=X|
|Each in Target Group|Initiator|Available at Times Y-Z |
|Initiator|Target Group|Select specific Targets at Time T|
|Initiator|Selected Targets|At time T:Version Manifest|
|Each Target|Initiator|Receipt Ack|
|Each Target|Initiator|Chunk Saved Ack|

Putting a new Version Mannifest is nearly identical
to putting a Payload Chunk, except that the Put
request is multicast to the NHID-derived group
(rather than CHID-derived) and that there will
not be a pre-existing Version Manifest with the
same UVID (Unique Version IDentifier).
