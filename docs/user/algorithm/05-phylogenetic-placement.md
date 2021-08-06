# 5. Phylogenetic placement

After reference alignment and mutation calling, Nextclade places each query sequence on the reference phylogenetic tree.

> 💡 Learn more about phylogenetic trees:
> - [Nextstrain narrative: How to interpret phylogenetic trees](https://nextstrain.org/narratives/trees-background)
> - [Wikipedia: Phylogenetic tree](https://en.wikipedia.org/wiki/Phylogenetic_tree)
>


> ⚠️ The root of the input phylogenetic tree **must** correspond to the input reference (root) sequence. Nextclade currently have no capability of verifying said correspondence. It is user's responsibility to ensure compatibility. Otherwise Nextclade will produce incorrect results without any indication of error.
>
> <br/>
>
> Datasets provided by Nextclade team are carefully curated such that, the reference (root) sequence is always the root of the tree within a given dataset (but not across datasets, in general case).
>

Phylogenetic placement is done by comparing the mutations of the query sequence (relative to the reference) with the mutations of every node and tip in the reference tree, and finding the node which has the most similar set of mutations.

In order to find the nearest reference node, the empirically chosen **distance metric** is calculated between each query sequence and reference node. It is defined as follows:

```math

D = M_{ref} + M_{query} - 2 M_{agree} - M_{disagree} - M_{unknown}

```

where

- ``$` D `$`` is the resulting distance metric

- ``$` M_{ref} `$`` is the total number of mutations in the reference node

- ``$` M_{query} `$`` is the total number of mutations in the query sequence

- ``$` M_{agree} `$`` is the number of exact mutations is shared between the reference node and the query sequence

- ``$` M_{disagree} `$`` is the number of mutations at the same position in the reference node and the query sequence, but where the states are different. This is where the reference node and the query sequence disagree

- ``$` M_{unknown} `$`` is number of undetermined (sites) - sites that are mutated in the reference node but are missing in the query sequence. For these we can't tell whether the reference node agrees with the query sequence

The nearest reference node is then chosen as the one having the lowest distance metric ``$` D `$``. A new node is created and attached (placed) as a child to that nearest node. It is given the attributes describing the corresponding query sequence (name, mutations, divergence etc.)

This operation is repeated for each query sequence, until all of them are placed onto the tree.

New nodes are never considered as a targets for the placement to avoid emergence of spurious hierarchies (see the [Phylogenetic placement: Known limitations](#known-limitations) section below).

Mutations that separate the query sequence and the nearest node are designated "private mutations". Mutations that are the same is the query sequence and in the nearest node we call "shared mutations".

Sequencing errors and sequence assembly problems are expected to give rise to more private mutations than usual. Thus, an excess of such mutations is a useful [quality control (QC) metric](07-quality-control.md). In addition to the overall number of such private mutations, Nextclade also assesses whether they cluster in specific regions of the genome, as such clusters give more fine grained indications of potential quality issues.

### Known limitations

> ⚠️ Phylogenetic placement in Nextclade is not a substitution for the full phylogenetic analysis with [Nextstrain](https://nextstrain.org).

Phylogenetic placement in Nextclade is a quick and simple way to obtain rough positioning of new samples on an existing phylogenetic tree. It is designed to work in a web browser, on relatively underpowered client machines. In order to achieve this goal, Nextclade trades accuracy to speed.

Nextclade does not have access to the time information and various other metadata, so it is not possible to perform a true phylogenetic analysis and to build a tree from scratch. Instead, phylogenetic placement relies on an existing high-quality tree produced by Nextstrain Augur (as a result of the full phylogenetic analysis). Nextclade relies on the metadata, time information and clades encoded into that tree. It is important for the reference tree to be sufficiently large, diverse and representative of the studied sequences in order to produce a good placement.

The following limitations are inherent to this approach (compared to the Nextstrain pipeline):

- A tree cannot be built from scratch. Nextclade requires an existing, high-quality input reference tree with representative samples on it. The new sequences are added to it.

- Only the relationships between reference nodes and query sequences are deduced, in pairwise fashion. That is, query samples are only compared to reference samples and never to the other query samples. When placing a query sequence, Nextclade ignores the new nodes (the query sequences that were already placed). This is to avoid building imaginary hierarchies, which depend on the order of attachment of new nodes. In the absence of time information associated with the newly placed samples, it is not easy to deduce the relationships between them. And Nextclade currently chooses not to try.

- The clade information is taken from the reference nodes (see [Clade assignment](06-clade-assignment) section). Only clades that are present in the input reference tree can be assigned to the new nodes. The diversity and the completeness of the set of clades

### Results

Phylogenetic placement results in creation of a new tree, which is identical to the input tree, but with the new nodes (corresponding to the query sequences) attached to it.

It can be viewed on the "Tree" page on [Nextclade Web](../nextclade-web).

It is being output as a file by [Nextclade CLI](../nextclade-cli) and can be obtained in the "Download" dialog of [Nextclade Web](../nextclade-web).

The tree file can be also viewed by dropping it to [auspice.us](https://auspice.us).
