# Auspice keeps an unavailable branch length

## Problem

Auspice 3.2.0 checks the selected branch length against the available ones only in `checkAndCorrectErrorsInState()`, which runs when a dataset loads. The default branch length is the time axis, so every load of a tree without dates on every node logs the console error "Requested distance measure 'num_date' is not valid" before Auspice switches to divergence. `createTreeTooState()`, which shows a second tree, does not run that check: when the second tree lacks the selected branch length (no dates, or none of the mutations of the selected CDS), Auspice keeps it, and the nodes of the second tree get no position or a position of zero.

Nextclade fixes this in the Bun patch of Auspice, `packages/nextclade-web/patches/auspice@3.2.0.patch`: `modifyControlsStateViaTree()` switches to the first available branch length when the selected one is not available, and `createTreeTooState()` computes the branch lengths of the main tree again, as the second tree can change the selection.

## Code

- Available measures: [actions/recomputeReduxState.js#L482-L490](https://github.com/nextstrain/auspice/blob/db211cc6b44296d92529844502a95a3e68710449/src/actions/recomputeReduxState.js#L482-L490)
- Check on load: [actions/recomputeReduxState.js#L600](https://github.com/nextstrain/auspice/blob/db211cc6b44296d92529844502a95a3e68710449/src/actions/recomputeReduxState.js#L600)
- Second tree: [actions/recomputeReduxState.js#L1157-L1158](https://github.com/nextstrain/auspice/blob/db211cc6b44296d92529844502a95a3e68710449/src/actions/recomputeReduxState.js#L1157-L1158)

## Fix

Contribute the change to [nextstrain/auspice](https://github.com/nextstrain/auspice), then remove it from the patch after upgrading to an Auspice release that contains it.
