# 5. Phylogenetic placement

After reference alignment and mutation calling, Nextclade places each query sequence on the reference phylogenetic tree.

> 💡 Learn more about phylogenetic trees:
> - [Nextstrain narrative: How to interpret phylogenetic trees](https://nextstrain.org/narratives/trees-background)
> - [Wikipedia: Phylogenetic tree](https://en.wikipedia.org/wiki/Phylogenetic_tree)
>


> ⚠️ The root of the input phylogenetic tree **must** correspond to the input reference (root) sequence. If the reference sequence differs from the sequence of the root node, the differences between the two have to be added as mutations ancestral to the root node. Nextclade will error when inconsistencies are between diversity in the tree and the reference sequence are encountered.
>

Phylogenetic placement is done by comparing the mutations of the query sequence (relative to the reference) with the mutations of every node and tip in the reference tree, and finding the node which has the most similar set of mutations.

In order to find the nearest reference node, the empirically chosen **distance metric** is calculated between each query sequence and reference node. It is defined as follows:

```math

D = M_{ref} + M_{query} - 2 M_{agree} - M_{disagree} - M_{unknown}

```

where

- ``$ D $`` is the resulting distance metric

- ``$ M_{ref} $`` is the total number of mutations in the reference node

- ``$ M_{query} $`` is the total number of mutations in the query sequence

- ``$ M_{agree} $`` is the number of exact mutations is shared between the reference node and the query sequence

- ``$ M_{disagree} $`` is the number of mutations at the same position in the reference node and the query sequence, but where the states are different. This is where the reference node and the query sequence disagree

- ``$ M_{unknown} $`` is number of undetermined (sites) - sites that are mutated in the reference node but are missing in the query sequence. For these we can't tell whether the reference node agrees with the query sequence

The nearest reference node is then chosen as the one having the lowest distance metric ``$ D $``.
If multiple candidate attachment nodes with the same distance exist, Nextclade can use a "placement prior" to pick the most likely node based on its prevalence in the overall sequence data.
Note that this option exists only when such placement information is coded into the reference tree of the dataset.

This operation is repeated for each query sequence, until all of them are placed onto the tree.

Other query sequences are never considered as targets for the initial placement such that information derived from the placement on the reference tree (see for example [clade assignment](06-clade-assignment)) does not depend on other query sequences. Note, however, that Nextclade now supports a greedy type of tree-building performed at the final step of the analysis that will consider relation-ships between query sequences (see [tree building](#tree-building)).

Mutations that separate the query sequence and the nearest node in the reference tree are designated "private mutations". Mutations that are the same is the query sequence and in the nearest node we call "shared mutations".

Sequencing errors and sequence assembly problems are expected to give rise to more private mutations than usual. Thus, an excess of such mutations is a useful [quality control (QC) metric](07-quality-control.md). In addition to the overall number of such private mutations, Nextclade also assesses whether they cluster in specific regions of the genome, as such clusters give more fine-grained indications of potential quality issues.

### Tree building

After all query sequences have been assigned their initial placement on the tree, Nextclade will resolve local phylogenetic relationships between the query sequences and refine the tree (optional in CLI, dataset-specific in the web app).

Nextclade sorts query sequences by the number of mutations to their closest reference node and will start refining their attachment positions starting with the queries closest to the reference tree. For each query sequence, it will check whether there are some mutations shared with branches in the immediate neighborhood. If such mutations exist, the corresponding branches will be split to optimally position the query, or, if all mutations on a branch are shared with another branch, the query will be moved along this branch to a new position.

This procedure is repeated until no further local improvement is possible and a new node corresponding to the query (along with necessary internal nodes) is added to the tree.

The position of the next sequence will now be refined on the tree with the previous sequences already attached at their refined positions, gradually building up the phylogenetic structure among the query sequences.

This greedy tree-building approach works the diversity of the population is well represented by the reference tree and remaining diversity among the query sequences is small.

### Known limitations

> ⚠️ Phylogenetic placement and the local greedy tree-builing in Nextclade are not a substitution for the full phylogenetic analysis with [Nextstrain](https://nextstrain.org) or other tools.

Phylogenetic placement and refinement in Nextclade is a quick and simple way to obtain rough positioning of new samples on an existing phylogenetic tree. It is designed to work in a web browser, on relatively underpowered client machines. In order to achieve this goal, Nextclade limits refinement to a local greedy search.

Nextclade does not have access to the time information and various other metadata, so it is not possible to perform a true phylogenetic analysis and to build a tree from scratch. Instead, phylogenetic placement relies on an existing high-quality tree produced by Nextstrain Augur (as a result of the full phylogenetic analysis). Nextclade relies on the metadata, time information and clades encoded into that tree. It is important for the reference tree to be sufficiently large, diverse and representative of the studied sequences in order to produce a good placement.

The following limitations are inherent to this approach (compared to the Nextstrain pipeline):

- While a tree can be built from scratch in principle, a high-quality input reference tree with representative samples is necessary for reliable resolution of phylogenetic structure.

- The clade information is taken from the initial placement on the reference tree (see [Clade assignment](06-clade-assignment) section). Only clades that are present in the input reference tree can be assigned to the new nodes and modifications to the tree structure by tree-refinement are not represented in the initial clade assignment.

### Results

Phylogenetic placement results in creation of a new tree, which is identical to the input tree, but with the new nodes (corresponding to the query sequences) added to it.

It can be viewed on the "Tree" page on [Nextclade Web](../nextclade-web).

It is being output as a file by [Nextclade CLI](../nextclade-cli) and can be obtained in the "Download" dialog of [Nextclade Web](../nextclade-web) in Auspice's JSON format or as Newick string.

The tree file can be also viewed by dropping it to [auspice.us](https://auspice.us).
