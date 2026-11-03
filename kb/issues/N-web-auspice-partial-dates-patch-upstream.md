# Auspice offers a time axis for trees where only some nodes have dates

## Problem

Auspice 3.2.0 offers the time branch length, the clock layout and the date controls when the root node of the tree has a date (`num_date`), in `findAvailableDistanceMeasures()`. Nextclade places the analyzed sequences onto reference trees and adds nodes without dates: the sequences, and the internal nodes that attach them. Some reference trees have a date on every node, for example the West Nile virus dataset (`nextstrain/wnv/all-lineages`). On these trees Auspice offered the time view, and placed none of the analyzed sequences on the time axis: their positions were not numbers, so the sequences were missing from the drawing.

Nextclade fixes this in the Bun patch of Auspice, `packages/nextclade-web/patches/auspice@3.2.0.patch`: `findAvailableDistanceMeasures()` offers the time axis only when every node of the tree has a date. While a second tree is shown, Auspice offers the branch lengths that both trees have, so the time axis then needs a date on every node of both trees. Trees with undated nodes are shown by divergence or by a mutation count, with no time branch length, clock layout or date controls.

## Code

- Time axis availability: [util/computeDistanceMetric.ts#L102](https://github.com/nextstrain/auspice/blob/db211cc6b44296d92529844502a95a3e68710449/src/util/computeDistanceMetric.ts#L102)

## Fix

Contribute the change to [nextstrain/auspice](https://github.com/nextstrain/auspice), then remove it from the patch after upgrading to an Auspice release that contains it.
