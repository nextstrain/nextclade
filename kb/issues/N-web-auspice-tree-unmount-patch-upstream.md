# Auspice tree keeps drawing after it unmounts

## Problem

Auspice 3.1.0's tree component removes its drawing when it unmounts, but the tree objects keep their pending drawing steps: staged transitions of an update, and the timers that draw tip labels. When the tree page closes during an update (for example, the user leaves the page right after a change of the coloring), these steps run against a drawing that is no longer in the document.

Nextclade fixes this in the Bun patch of Auspice, `packages/nextclade-web/patches/auspice@3.1.0.patch`, registered in `patchedDependencies` in `packages/nextclade-web/package.json`: `componentWillUnmount()` calls a `dispose()` step on each tree object before the drawing is removed, which stops the staged transitions and the tip label timers.

## Code

- `TreeComponent.componentWillUnmount()`: removes the drawing ([tree/tree.tsx#L81-L86](https://github.com/nextstrain/auspice/blob/v3.1.0/src/components/tree/tree.tsx#L81-L86))

## Fix

Contribute the change to [nextstrain/auspice](https://github.com/nextstrain/auspice). After upgrading to an Auspice release that contains it, remove the change from the patch. The patch file also holds the changes in the other `N-web-auspice-*-patch-upstream.md` issues. When the patch has no changes left, delete the patch file and its `patchedDependencies` entry. Bun refuses to install when the patch no longer applies to a new Auspice version, so an upgrade without this step fails visibly.

## Editing the patch

The patch is a Git diff against the published Auspice package. Among others, it makes the extension registry of Auspice (`src/util/extensions.ts`) read the `@extensions` module, which Nextclade aliases to `packages/nextclade-web/src/components/Tree/auspiceExtensions.ts`, because webpack resolves the `require.context("@extensions")` of the stock registry at build time.

`bun patch auspice` fails with `error overwriting folder in node_modules: FileNotFound` and deletes `node_modules/auspice`, because the post-install script `packages/nextclade-web/tools/monkeyPatch.ts` deletes `src/util/perf.js` from the installed package. Edit the patch against a copy of the published package instead:

1. Run `npm pack auspice@<version>` in a scratch directory, and extract the archive twice: once as the base, once for editing
2. In the copy for editing, apply the current patch with `patch -p1 < <nextclade>/packages/nextclade-web/patches/auspice@<version>.patch`, and edit the files
3. Run `git init`, `git add -A` and `git commit` in the base copy, copy the edited `src/` over it, and write the patch with `git diff --full-index > auspice@<version>.patch`
4. Replace the patch file, delete `node_modules/auspice` and the patched copies of Auspice in the Bun install cache (`auspice@<version>@@@1_patch_hash=*`, in `.cache/docker/.bun/install/cache` for the project container), and run `./docker/dev a bun install`. Bun can otherwise install a patched copy from an earlier version of the patch file. Check that the files in `node_modules/auspice` contain the change
5. Restart the dev server with an empty `.build/development`, because webpack does not rebuild changed files in `node_modules`
