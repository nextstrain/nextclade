# Auspice tree label fixes are a local patch

## Problem

Auspice 3.0.0 cuts or misplaces several labels of the tree drawing:

- **Branch labels near the root**: in the rectangular, clock and scatter layouts, each branch label ends 5 px before its node on the root side. The margin on that side is 5 px (40 px in the clock and scatter layouts), so the label of a branch that starts near the root, such as the first clade after the root, is wider than the space before its node and its beginning is cut off. How much is cut off depends on the tree width
- **Tip label margin**: the margin on the tip side is estimated from the strain names and compares a width in pixels with a number of characters, so it is too narrow or too wide for the labels on screen, in particular for tip labels other than the strain name. Changing the tip label does not recompute the layout
- **Grid and axis labels**: x-axis labels are centered on their grid line, so the labels of grid lines near the left or right edge of the SVG are cut off. Labels of grid lines at the top or bottom edge are cut. The baseline of the x-axis title sits 1 px above the bottom edge, which cuts its descenders, and the upright y-axis title can extend past the left edge
- **Temporal grid on narrow axes**: an axis narrower than the minimum distance between major grid lines gets an infinite step between grid lines
- **Clock regression text**: the rate estimate is placed at a fixed offset and can extend past the tree on narrow screens

Nextclade fixes these in the Bun patch of Auspice, `packages/nextclade-web/patches/auspice@3.0.0.patch`. The patch measures labels with the font of the tree, widens the margin on the root side just enough for the visible branch labels (at most a quarter of the tree width, and hides a label that still does not fit), extends the clip area over that margin, sizes the tip side from the labels on screen, recomputes the layout when the branch or tip labels change, aligns, hides or moves grid and axis labels to keep them whole, divides the temporal axis into at least one interval, and centers the rate estimate and sets it smaller where it is wider than the tree.

## Code

- Left margin: [tree/phyloTree/layouts.ts#L351](https://github.com/nextstrain/auspice/blob/v3.0.0/src/components/tree/phyloTree/layouts.ts#L351)
- Tip label margin: [tree/phyloTree/layouts.ts#L631-L653](https://github.com/nextstrain/auspice/blob/v3.0.0/src/components/tree/phyloTree/layouts.ts#L631-L653)
- Branch label position: [tree/phyloTree/labels.js#L149-L151](https://github.com/nextstrain/auspice/blob/v3.0.0/src/components/tree/phyloTree/labels.js#L149-L151)
- Clip area start: [tree/phyloTree/renderers.ts#L516](https://github.com/nextstrain/auspice/blob/v3.0.0/src/components/tree/phyloTree/renderers.ts#L516)
- Grid label position: [tree/phyloTree/grid.js#L385](https://github.com/nextstrain/auspice/blob/v3.0.0/src/components/tree/phyloTree/grid.js#L385)
- Upright y-axis title: [tree/phyloTree/grid.js#L425](https://github.com/nextstrain/auspice/blob/v3.0.0/src/components/tree/phyloTree/grid.js#L425)
- Temporal grid step: [tree/phyloTree/grid.js#L122](https://github.com/nextstrain/auspice/blob/v3.0.0/src/components/tree/phyloTree/grid.js#L122)
- Rate estimate position: [tree/phyloTree/renderers.ts#L403](https://github.com/nextstrain/auspice/blob/v3.0.0/src/components/tree/phyloTree/renderers.ts#L403)

## Fix

Contribute the changes to [nextstrain/auspice](https://github.com/nextstrain/auspice), then remove them from the patch after upgrading to an Auspice release that contains them. [N-web-auspice-tree-unmount-patch-upstream.md](N-web-auspice-tree-unmount-patch-upstream.md) describes how to edit the patch.
