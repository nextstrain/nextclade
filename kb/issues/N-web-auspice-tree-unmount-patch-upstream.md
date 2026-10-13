# Auspice tree mount and unmount handling is a local patch

## Problem

React StrictMode, which Nextclade enables in development, unmounts every component right after its first mount and mounts the same instance again, keeping its DOM and its state. Auspice 3.0.0's tree component has no `componentWillUnmount()`, and its `componentDidMount()` draws a new tree object into the SVG each time:

- **Stock Auspice**: the second mount draws a second tree next to the first. React 18 keeps the state of the first mount, so the component keeps updating the first tree, and the second drawing stays in the SVG as a ghost that does not react to updates. After a resize, the ghost shows at the old width
- **Clearing the SVG on unmount**: emptying the SVG in `componentWillUnmount()` removes the ghost, but the component then keeps updating the first tree, whose elements are no longer in the document. Auspice 3.0.0 draws the axis labels from their position in the document, so the next update fails with `Cannot read properties of null (reading 'getAttribute')`

Nextclade fixes this in the Bun patch of Auspice, `packages/nextclade-web/patches/auspice@3.0.0.patch`, registered in `patchedDependencies` in `packages/nextclade-web/package.json`. `componentWillUnmount()` schedules the cleanup for the next task, and `componentDidMount()` cancels it and keeps the drawn tree when React mounts the same instance again at once. After a real unmount, the cleanup disposes the tree objects: a `dispose()` step on the tree object stops pending staged transitions and tip label timers from drawing.

## Code

- `TreeComponent.componentDidMount()`: draws the tree and stores it in the state ([tree/tree.tsx#L67-L78](https://github.com/nextstrain/auspice/blob/v3.0.0/src/components/tree/tree.tsx#L67-L78))

## Fix

Contribute the patch to [nextstrain/auspice](https://github.com/nextstrain/auspice). After upgrading to an Auspice release that contains it, remove the change from the patch. The patch file also holds the changes in the other `N-web-auspice-*-patch-upstream.md` issues. When the patch has no changes left, delete the patch file and its `patchedDependencies` entry. Bun refuses to install when the patch no longer applies to a new Auspice version, so an upgrade without this step fails visibly.

## Editing the patch

The patch is a Git diff against the published Auspice package. The patch also replaces the extension registry of Auspice (`src/util/extensions.ts`) with an empty one: Nextclade builds the Auspice sources with its own webpack configuration, which has no `@extensions` alias, and webpack resolves the `require.context("@extensions")` of the stock registry at build time.

`bun patch auspice` fails with `error overwriting folder in node_modules: FileNotFound` and deletes `node_modules/auspice`, because the post-install script `packages/nextclade-web/tools/monkeyPatch.ts` deletes `src/util/perf.js` from the installed package. Edit the patch against a copy of the published package instead:

1. Run `npm pack auspice@<version>` in a scratch directory, and extract the archive twice: once as the base, once for editing
2. In the copy for editing, apply the current patch with `patch -p1 < <nextclade>/packages/nextclade-web/patches/auspice@<version>.patch`, and edit the files
3. Run `git init`, `git add -A` and `git commit` in the base copy, copy the edited `src/` over it, and write the patch with `git diff --full-index > auspice@<version>.patch`
4. Replace the patch file, delete `node_modules/auspice` and the patched copies of Auspice in the Bun install cache (`auspice@<version>@@@1_patch_hash=*`, in `.cache/docker/.bun/install/cache` for the project container), and run `bun install`. Bun can otherwise install a patched copy from an earlier version of the patch file. Check that the files in `node_modules/auspice` contain the change
5. Restart the dev server with an empty `.build/development`, because webpack does not rebuild changed files in `node_modules`
