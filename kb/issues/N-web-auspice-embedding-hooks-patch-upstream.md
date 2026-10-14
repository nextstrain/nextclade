# Auspice lacks hooks for apps that embed its components

## Problem

Nextclade renders Auspice components inside its own pages and builds the Auspice sources with its own webpack configuration. Auspice 3.0.0 assumes its own app and build in several places, which the Bun patch of Auspice, `packages/nextclade-web/patches/auspice@3.0.0.patch`, changes:

- **Extensions registry**: Auspice reads its extensions from a build-time `EXTENSION_DATA` variable and loads them through webpack's `require.context("@extensions")`. The patch imports the registry from the `@extensions` module, which Nextclade aliases to `packages/nextclade-web/src/components/Tree/auspiceExtensions.ts`. `getExtension()` also returns registered values that are falsy, such as `false`
- **Figure caption**: the SVG download writes the text lines of a Nextstrain dataset below the figure: its address, data use terms and the CC-BY license. The patch adds a `caption` parameter to `SVG()` that replaces these lines, which Nextclade uses to name the dataset and the Nextclade version
- **Download modal**: the "d" key opens Auspice's download modal, which offers downloads of Nextstrain datasets. The patch skips the key when the `downloadModal` extension is `false`, as Nextclade sets it, because Nextclade offers the files of its analysis instead
- **Kept view**: once the tree is drawn, Auspice keeps the zoom on the drawn nodes only. The patch lets a new drawing of the same nodes take the zoom from the previous drawing, so that the tree page, which keeps its store while the user visits other pages, draws a returning tree at its zoom

## Code

- Extensions registry: [util/extensions.ts#L8-L35](https://github.com/nextstrain/auspice/blob/v3.0.0/src/util/extensions.ts#L8-L35)
- SVG download entry: [download/helperFunctions.js#L646](https://github.com/nextstrain/auspice/blob/v3.0.0/src/components/download/helperFunctions.js#L646)
- Download modal key: [modal/Modal.jsx#L29](https://github.com/nextstrain/auspice/blob/v3.0.0/src/components/modal/Modal.jsx#L29)
- Zoom of a new drawing: [tree/phyloTree/phyloTree.ts#L39](https://github.com/nextstrain/auspice/blob/v3.0.0/src/components/tree/phyloTree/phyloTree.ts#L39)

## Fix

Contribute the hooks to [nextstrain/auspice](https://github.com/nextstrain/auspice), then remove them from the patch after upgrading to an Auspice release that contains them.
