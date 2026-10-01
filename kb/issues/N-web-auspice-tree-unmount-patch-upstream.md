# Auspice tree unmount cleanup is a local patch

## Problem

Auspice's tree component draws its tree into the SVG when it mounts, and in Auspice 2.67.0 nothing removes that drawing when the component unmounts. When React mounts the component again into the same SVG elements, as React StrictMode does in development, the first tree stays in the SVG next to the second. The first tree no longer reacts to updates: after a resize it shows as a ghost at the old width, and its clip area, which shares the `treeClip` ID with the second tree, cuts the visible tree off at the old width.

Nextclade fixes this with a Bun patch of Auspice: `packages/nextclade-web/patches/auspice@2.67.0.patch`, registered in `patchedDependencies` in `packages/nextclade-web/package.json`. The patch adds `componentWillUnmount()` to the tree component and a `dispose()` step to the tree object, which stops pending staged transitions and tip label timers from drawing.

## Code

- `TreeComponent.componentDidMount()`: draws the tree and stores it in the state ([src/components/tree/tree.tsx#L69-L80](https://github.com/nextstrain/auspice/blob/v2.67.0/src/components/tree/tree.tsx#L69-L80))

## Fix

Contribute the patch to [nextstrain/auspice](https://github.com/nextstrain/auspice). After upgrading to an Auspice release that contains it, delete the patch file and its `patchedDependencies` entry. Bun refuses to install when the patch no longer applies to a new Auspice version, so an upgrade without this step fails visibly.
