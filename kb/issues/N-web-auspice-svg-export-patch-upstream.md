# Auspice SVG download cuts tree labels, misses off-screen charts and misplaces text after links

## Problem

The SVG download of Auspice 3.2.0, which the tree page offers as the "SVG" button, writes each panel as a nested `<svg>` of the panel's size, with `overflow="hidden"` and a `<clipPath>` of the panel's box:

- Tree labels that extend past the tree panel, such as long tip labels or axis labels at its edge, are cut off in the downloaded image, although the page shows them
- The entropy chart computes its bars only while it is on screen. Below the fold, as on the tree page, the downloaded image shows the chart without bars
- Text after an inline element loses the space before it: the download writes each HTML text node of the lines below the figure as an SVG `<text>` at the position of its first character, and SVG drops a leading space, so the caption line "Map: <a>Natural Earth</a> 5.1.2" read "Natural Earth5.1.2"

Nextclade fixes this in the Bun patch of Auspice, `packages/nextclade-web/patches/auspice@3.2.0.patch`: the download measures the labels of each tree panel and records the box of the panel and its labels, drops labels that are anchored outside the panel and never visible on screen, gives such a panel `overflow="visible"` and a clip path of that box (the nested viewport clips at the panel edge even when the clip path is larger), widens the image with a `viewBox` that holds the boxes, computes the entropy bars before writing the image when the chart has none, and starts each exported text line at its first visible character.

The end-to-end test "keeps the space between a link and the text after it below the figure" in `packages/nextclade-web/tests/e2e/tree-page.spec.ts` covers the text positioning.

## Code

- Panel serialization: [download/helperFunctions.js#L429](https://github.com/nextstrain/auspice/blob/db211cc6b44296d92529844502a95a3e68710449/src/components/download/helperFunctions.js#L429)
- Panel clipping: [download/helperFunctions.js#L570-L582](https://github.com/nextstrain/auspice/blob/db211cc6b44296d92529844502a95a3e68710449/src/components/download/helperFunctions.js#L570-L582)
- SVG download entry: [download/helperFunctions.js#L791](https://github.com/nextstrain/auspice/blob/db211cc6b44296d92529844502a95a3e68710449/src/components/download/helperFunctions.js#L791)
- Text lines of an HTML text node: [download/domToSvg.js#L106-L145](https://github.com/nextstrain/auspice/blob/db211cc6b44296d92529844502a95a3e68710449/src/components/download/domToSvg.js#L106-L145)

## Fix

Contribute the changes to [nextstrain/auspice](https://github.com/nextstrain/auspice), then remove them from the patch after upgrading to an Auspice release that contains them.
