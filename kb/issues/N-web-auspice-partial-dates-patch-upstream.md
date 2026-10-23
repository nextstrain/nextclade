# Auspice offers a time axis for trees where only some nodes have dates

## Problem

Auspice 3.1.0 offers the time metric, the clock layout and the date controls when the root node of the tree has a date (`num_date`). Nextclade places the analyzed sequences onto reference trees and adds nodes without dates: the sequences, and the internal nodes that attach them. Some reference trees have a date on every node, for example the West Nile virus dataset (`nextstrain/wnv/all-lineages`). On these trees Auspice offered the time view, and placed none of the analyzed sequences on the time axis: their positions were not numbers, so the sequences were missing from the drawing.

Nextclade fixes this in the Bun patch of Auspice, `packages/nextclade-web/patches/auspice@3.1.0.patch`: Auspice offers the time axis only when every node of the main tree and of the second tree has a date. Trees with undated nodes are shown by divergence, with no time metric, clock layout or date controls.

## Code

- Time axis availability: [actions/recomputeReduxState.js#L476-L480](https://github.com/nextstrain/auspice/blob/v3.1.0/src/actions/recomputeReduxState.js#L476-L480)

## Fix

Contribute the change to [nextstrain/auspice](https://github.com/nextstrain/auspice), then remove it from the patch after upgrading to an Auspice release that contains it.
