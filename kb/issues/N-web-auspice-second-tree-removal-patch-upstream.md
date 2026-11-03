# Auspice keeps the branch lengths of both trees after the second tree is removed

## Problem

While a second tree is shown, Auspice 3.2.0 offers the branch lengths that both trees have. When the second tree is removed, the controls keep that list, so the main tree does not offer again the branch lengths that the second tree lacked, such as the time axis or the mutation count of a CDS that only the main tree has, until the page loads the dataset again.

Nextclade fixes this in the Bun patch of Auspice, `packages/nextclade-web/patches/auspice@3.2.0.patch`: the thunk `removeSecondTree()` in `src/actions/tree.ts` dispatches `REMOVE_TREE_TOO` with the branch lengths of the main tree (`findAvailableDistanceMeasures(tree.nodes, entropy.genomeMap)`), and the controls reducer takes them. Auspice's second tree select and Nextclade's `hideSecondTree()` (`packages/nextclade-web/src/state/auspice/auspice.actions.ts`) dispatch the thunk.

## Code

- Controls reducer: [reducers/controls.ts#L509-L515](https://github.com/nextstrain/auspice/blob/db211cc6b44296d92529844502a95a3e68710449/src/reducers/controls.ts#L509-L515)
- Second tree select: [controls/choose-second-tree.js#L63](https://github.com/nextstrain/auspice/blob/db211cc6b44296d92529844502a95a3e68710449/src/components/controls/choose-second-tree.js#L63)

## Fix

Contribute the change to [nextstrain/auspice](https://github.com/nextstrain/auspice), then remove it from the patch after upgrading to an Auspice release that contains it.
