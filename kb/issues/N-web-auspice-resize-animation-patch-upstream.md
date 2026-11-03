# Auspice animates the tree when its size changes

## Problem

When the SVG of an Auspice 3.2.0 tree changes size, `change()` maps the tree to the new size with the usual transition. The SVG takes its new size at once, so the transition starts from positions computed for the old size and draws the tree out of place until it ends. The tree page changes the tree size whenever the sidebar opens or closes, the window is resized, or the header of the tree takes its own row above the tree.

Nextclade fixes this in the Bun patch of Auspice, `packages/nextclade-web/patches/auspice@3.2.0.patch`, registered in `patchedDependencies` in `packages/nextclade-web/package.json`: `change()` sets the transition time to 0 when the SVG size has changed.

## Code

- Transition time of an update: [tree/phyloTree/change.ts#L342-L345](https://github.com/nextstrain/auspice/blob/db211cc6b44296d92529844502a95a3e68710449/src/components/tree/phyloTree/change.ts#L342-L345)

## Fix

Contribute the change to [nextstrain/auspice](https://github.com/nextstrain/auspice), then remove it from the patch after upgrading to an Auspice release that contains it. [N-web-auspice-tree-unmount-patch-upstream.md](N-web-auspice-tree-unmount-patch-upstream.md) describes how to edit the patch.
