# Auspice SVG download cuts tree labels and misses off-screen charts

## Problem

The SVG download of Auspice 3.0.0, which the tree page offers as the "SVG" button, copies each panel into a box of the panel's size:

- Tree labels that extend past the tree panel, such as long tip labels or axis labels at its edge, are cut off in the downloaded image, although the page shows them
- The entropy chart computes its bars only while it is on screen. Below the fold, as on the tree page, the downloaded image shows the chart without bars

Nextclade fixes this in the Bun patch of Auspice, `packages/nextclade-web/patches/auspice@3.0.0.patch`: the download measures the labels of each tree panel and widens the image to hold them, drops labels that are anchored outside the panel and never visible on screen, and computes the entropy bars before writing the image when the chart has none.

## Code

- Panel serialization: [download/helperFunctions.js#L544-L560](https://github.com/nextstrain/auspice/blob/v3.0.0/src/components/download/helperFunctions.js#L544-L560)
- SVG download entry: [download/helperFunctions.js#L646](https://github.com/nextstrain/auspice/blob/v3.0.0/src/components/download/helperFunctions.js#L646)

## Fix

Contribute the changes to [nextstrain/auspice](https://github.com/nextstrain/auspice), then remove them from the patch after upgrading to an Auspice release that contains them.
