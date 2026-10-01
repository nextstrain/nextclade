# Auspice tree clip areas share one element ID

## Problem

Every Auspice tree object creates a `<clipPath>` with the fixed ID `treeClip`, and all branch, tip, label and grid groups clip to `url(#treeClip)`. Element IDs are unique per document, and the browser resolves a duplicated ID to the first element. When two trees are on one page, as in Auspice's side-by-side tree view, both trees clip to the clip area of the tree drawn first. Nextclade shows one tree at a time, so this affects Nextclade only together with the unmount bug in [N-web-auspice-tree-unmount-patch-upstream.md](N-web-auspice-tree-unmount-patch-upstream.md).

## Code

- Clip area creation: [src/components/tree/phyloTree/renderers.ts#L517](https://github.com/nextstrain/auspice/blob/v2.67.0/src/components/tree/phyloTree/renderers.ts#L517)
- Clip references: [src/components/tree/phyloTree/renderers.ts#L217](https://github.com/nextstrain/auspice/blob/v2.67.0/src/components/tree/phyloTree/renderers.ts#L217), [src/components/tree/phyloTree/labels.js#L138](https://github.com/nextstrain/auspice/blob/v2.67.0/src/components/tree/phyloTree/labels.js#L138), [src/components/tree/phyloTree/grid.js#L36-L39](https://github.com/nextstrain/auspice/blob/v2.67.0/src/components/tree/phyloTree/grid.js#L36-L39)

## Fix

Derive the clip ID from the tree ID (for example `treeClip-LEFT` and `treeClip-RIGHT`) and use it in every `url(#...)` reference. This is an upstream change in Auspice.
