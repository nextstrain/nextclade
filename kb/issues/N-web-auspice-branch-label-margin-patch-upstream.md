# Auspice branch label margin is a local patch

## Problem

In the rectangular tree layout, Auspice leaves a left margin of 5 px and draws each branch label so that it ends 5 px left of its node. The clip area of the tree starts 5 px left of the margin. A label on a branch that starts near the root, such as the clade label of the first clade after the root, is wider than the space left of its node, so its beginning is cut off. How much is cut off depends on the tree width.

Nextclade fixes this in the Bun patch of Auspice, `packages/nextclade-web/patches/auspice@2.67.0.patch`. In the rectangular layout, the patch widens the left margin just enough for the visible branch labels to fit inside the SVG, and extends the clip area over the added margin. Changing the branch label setting or "show all labels" recomputes the layout, because the margin depends on the labels.

The x-axis labels have the same problem: Auspice centers each label on its grid line, so the label of the first grid line, which sits on the left margin, extends past the left edge of the SVG. The patch aligns a label that would cross the left or right edge of the SVG to its grid line on the inner side, and keeps the other labels centered.

## Code

- Left margin: [layouts.ts#L351](https://github.com/nextstrain/auspice/blob/v2.67.0/src/components/tree/phyloTree/layouts.ts#L351)
- Clip area start: [renderers.ts#L509](https://github.com/nextstrain/auspice/blob/v2.67.0/src/components/tree/phyloTree/renderers.ts#L509)
- Branch label position: [labels.js#L150](https://github.com/nextstrain/auspice/blob/v2.67.0/src/components/tree/phyloTree/labels.js#L150)
- x-axis label alignment: [grid.js#L320](https://github.com/nextstrain/auspice/blob/v2.67.0/src/components/tree/phyloTree/grid.js#L320)

## Fix

Contribute the margin change and the x-axis label alignment to [nextstrain/auspice](https://github.com/nextstrain/auspice), then remove them from the patch after upgrading to an Auspice release that contains it.
