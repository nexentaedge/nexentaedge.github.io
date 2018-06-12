---
title: Unique Version IDs and Generations, but no Version Numbers
author: Caitlin Bestler
tags: {NexentaEdge,CCOW,Versioning}
---
How do you assign a unique version number for a new object version even when the network is split? Two clients, A and B, both want to create a new version of Object X, but there is no network connectivity between them. What do you do?
* Only allow the client connected with a quorum to put their new version. Keep in mind that neither might be within the quorum. Any version not accepted is in danger of loss from client machine or drive failure.
* Create a unique identifier that does not require any form of serialization.

NexentaEdge does the latter, creating a Unique Version Identifier (UVID) by extending a high precision timestamp with the network id of the client. Now the versions created by A and B will be unique, and all nodes will agree on which one was posted later.

While it works the UVID is somewhat awkward. It is large, it is difficult to sequence, and it does not identify when there are two potentially conflicting edits.

NexentaEdge solves this by adding a "Generation' metadata field. A client sets this to 1 greater than what it perceives the current Generation to be.

So, A and B both observe object X with UVID Y and Generation 7. A then puts object X UVID Y1 Generation 8, while B puts object X UVID Y2 Generation 8. Even if they put the versions at exactly the same tick their network address will break the tie. All nodes will agree that B's version is later than A's because even though their timestamp is identical the tie is broken by B's "later" address.

We now have two Generation 8 object versions. This is actually good, because the alternative is to not accept one of them. What the Generation field does is flag that a version has been eclipsed, a 'later' version has superceded it without its contents having been fetched while preparing that 'later' version.

Was information lost? There is no automated method that can automatically correctly evaluate two versions. A human editor is going to have to review the two edits and decide what if any change is required to create a Generation 9 version. Citing the additional 'based upon' versions signals that the split has been resolved. The split no longer needs to be highlighted or have an extended hold on those versions.

Normally the 'Generation' field will look like a normal "version number". It will monotonically increase. Putting more than one version during the short get-through-put cycle will be rare. But when it happens the system can notify the authors of the confict and automatically hold the eclipsed versions until a merged later Generation is posted.
