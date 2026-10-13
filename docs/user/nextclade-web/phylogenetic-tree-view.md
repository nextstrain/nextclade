## Phylogenetic tree view

In order to assign clades to sequences, Nextclade [places](../algorithm/03-phylogenetic-placement.md) all new sequences on a reference tree. You can view the resulting tree by clicking on the tree tab at the top left.

The tree is visualized by [Nextstrain Auspice](https://docs.nextstrain.org/projects/auspice/en/stable/). By default, only your uploaded sequences are highlighted.
![Tree with new sequences](../assets/web_tree.png)

Nextclade runs a greedy parsimony tree builder on user provided sequences. This means that approximate ancestral relationships between your sequences are visible on the tree. Given the simplicity of the tree builder, the tree is not guaranteed to be optimal. In the screenshot below, all but the 3 grey sequences are user provided. Nextclade has grouped related user provided sequences into clusters, based on shared mutations.

![Nextclade tree builder](../assets/web_tree-builder.png)

For a more accurate tree including your sequences, you can use [Usher](https://genome.ucsc.edu/cgi-bin/hgPhyloPlace), which works out of the box with SARS-CoV-2, hMPXV, RSV-A, and RSV-B (as of January 2024).

### Sidebar controls

The sidebar on the left of the tree holds the Auspice controls that apply to the tree of a Nextclade analysis:

- **Color By** and **Filter Data**: color the tree and filter its tips by clade, QC status, node type, and the other attributes of the dataset
- **Layout**, **Focus on selected**, **Branch Labels**, and **Tip Labels**: arrange and label the tree
- **Explode Tree By**: split the tree into subtrees where an attribute changes along a branch, for example one subtree per clade
- **Entropy**: show or hide the diversity chart of the genome below the tree

The map, date range, animation, and frequency controls of Auspice are not available, because the sequences that Nextclade places on the tree have no location or sampling date.

On narrow screens, the sidebar opens over the tree and closes with the tab on its edge, and the row with the filters and the download buttons moves above the tree.

### Multi-dataset mode

In multi-dataset mode, you can switch between datasets through the dataset selector on the top left.

![Switching between datasets](../assets/web_switch-tree-dataset.png)
