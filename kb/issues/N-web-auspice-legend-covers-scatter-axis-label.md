# Collapsed tree legend covers the top y-axis label in the scatter layout

## Problem

Auspice draws the collapsed tree legend ("Clade" with a chevron) over the top left corner of the tree. In the scatter layout with a categorical y axis, such as clade, the label of the topmost category sits under the legend and cannot be read.

## Code

- Legend position: [components/tree/legend/legend.js#L213-L227](https://github.com/nextstrain/auspice/blob/v3.0.0/src/components/tree/legend/legend.js#L213-L227)

## Fix

Leave room for the collapsed legend above the y axis in the scatter layout, or move the legend out of the drawing. This is an upstream change in Auspice.
