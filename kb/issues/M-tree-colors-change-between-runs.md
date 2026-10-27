# Tree colors of clade-like values change between runs

## Problem

When a dataset sets no colors for a coloring of the tree, Auspice chooses the colors from the values in the tree. For `clade_membership` it sorts the values alphabetically. For every other attribute it sorts the values by the number of nodes that have them, and this count includes the nodes that Nextclade places on the tree. So the color of a value depends on the other sequences of the run.

The tree page and the circles before clade-like values in the results table show these colors. A user who compares two runs, or a screenshot with a later run, sees the same lineage in different colors. For example, with the SARS-CoV-2 dataset, a run on the example sequences and a run on a part of the same sequences show most Pango lineages (`Nextclade_pango`) and display names (`clade_display`) in different colors.

Colorings with a dataset scale and `clade_membership` keep their colors across runs.

## Code

- Auspice sorts the values of a coloring without a scale in `sortedDomain` (`src/util/sortedDomain.js` of Auspice 3.1.0), with the counts of `getDiscreteValuesFromTree` over all nodes (`src/util/colorScale.ts`)
- Nextclade adds the placed sequences to the tree before Auspice computes the colors (`packages/nextclade/src/tree/tree_attach_new_nodes.rs`)

## Fix options

- **Scales from the reference tree**: Nextclade computes the order of the values from the reference tree only and writes it as `scale` into the colorings of the output tree. The colors then stay the same across runs. This changes `tree.json` and the colors of the tree page
- **Dataset scales**: datasets set colors for their clade-like attributes. This is a dataset change only
