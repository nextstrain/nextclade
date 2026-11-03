# Auspice titles scatterplot axes of branch lengths by their option labels

## Problem

The scatterplot layout of Auspice 3.2.0 gives an axis of a branch length the title of that branch length ("Divergence" or "Mutations", "Date", "(number of valid) nuc mutations") only when the axis label equals the key of the measure. The labels are option titles (`xLabel`, `yLabel`, for example "Divergence" or "Mutation counts: nuc"), so the test fails for every branch length, and divergence is always titled "Divergence", also when the values are counts of mutations. The y axis also reads its "Divergence" or "Mutations" title from the scale of the x axis.

Nextclade fixes this in the Bun patch of Auspice, `packages/nextclade-web/patches/auspice@3.2.0.patch`: the scatter branch of `addGrid()` tests the axis variables (`scatterVariables.x`, `scatterVariables.y`) and titles each axis from its own scale.

## Code

- Axis titles: [phyloTree/grid.js#L416-L424](https://github.com/nextstrain/auspice/blob/db211cc6b44296d92529844502a95a3e68710449/src/components/tree/phyloTree/grid.js#L416-L424)

## Fix

Contribute the change to [nextstrain/auspice](https://github.com/nextstrain/auspice), then remove it from the patch after upgrading to an Auspice release that contains it.
