# Auspice tree clip areas share one element ID

## Problem

In Auspice 3.0.0, every tree object creates a `<clipPath>` with the fixed ID `treeClip`, and all branch, tip, label and grid groups clip to `url(#treeClip)`. Element IDs are unique per document, and the browser resolves a duplicated ID to the first element. When two trees are on one page, as in Auspice's side-by-side tree view, both trees clip to the clip area of the tree drawn first. The SVG download also writes both clip areas under one ID.

Nextclade derives the clip ID from the tree ID (`treeClip-LEFT`, `treeClip-RIGHT`) in the Bun patch of Auspice, `packages/nextclade-web/patches/auspice@3.0.0.patch`. Nextclade shows one tree at a time, so the shared ID does not show there, but the patch keeps the clip area of a tree independent of other trees in the page.

## Code

- Clip area creation: [tree/phyloTree/renderers.ts#L524](https://github.com/nextstrain/auspice/blob/v3.0.0/src/components/tree/phyloTree/renderers.ts#L524)
- Clip references: [tree/phyloTree/renderers.ts#L224](https://github.com/nextstrain/auspice/blob/v3.0.0/src/components/tree/phyloTree/renderers.ts#L224), [tree/phyloTree/labels.js#L138](https://github.com/nextstrain/auspice/blob/v3.0.0/src/components/tree/phyloTree/labels.js#L138), [tree/phyloTree/grid.js#L36-L39](https://github.com/nextstrain/auspice/blob/v3.0.0/src/components/tree/phyloTree/grid.js#L36-L39)

## Fix

Contribute the change to [nextstrain/auspice](https://github.com/nextstrain/auspice), then remove it from the patch after upgrading to an Auspice release that contains it.
