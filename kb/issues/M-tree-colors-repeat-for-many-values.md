# Unrelated clades share a tree color when a coloring has many values

## Problem

When a dataset sets no colors for a coloring of the tree, Auspice takes the colors from a palette of at most 36 colors. A coloring with more values uses the palette again from its start, so unrelated values get the same color. Neighbor values in the sort order also get colors that are hard to tell apart.

The tree page and the circles before clade-like values in the results table show these colors. Examples:

- Influenza A H3N2 HA (`nextstrain/flu/h3n2/ha/EPI1857216`): clades `J.2.5` and `B.1.2.1.1` have the same color, and so do `K` and `B.4`
- RSV A: clades `A.D` and `A.D.5.4` have the same color
- SARS-CoV-2: Pango lineages such as `HV.1` and `HV.1.6` have the same color

## Code

- Auspice picks the palette in `createDiscreteScale` and uses its largest palette for more values (`src/util/colorScale.ts` of Auspice 3.1.0)

## Fix options

- **Dataset scales**: datasets with many clades set distinct colors, for example colors that follow the clade hierarchy. This is a dataset change only
- **Scales from Nextclade**: Nextclade writes scales with distinct colors into the colorings of the output tree. This changes `tree.json` and the colors of the tree page
