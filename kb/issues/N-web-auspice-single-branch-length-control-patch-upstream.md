# Auspice shows the Branch Length control with one option

## Problem

Auspice 3.2.0 always shows the Branch Length select in the sidebar, also when the tree offers one branch length only, for example a tree with divergence and without dates or mutations. The select then offers nothing to choose. Auspice 3.1.0 showed the control only for trees with both divergence and dates.

Nextclade fixes this in the Bun patch of Auspice, `packages/nextclade-web/patches/auspice@3.2.0.patch`: `ChooseMetric` renders nothing when the tree offers fewer than two branch lengths.

## Code

- Control: [controls/choose-metric.tsx#L64-L66](https://github.com/nextstrain/auspice/blob/db211cc6b44296d92529844502a95a3e68710449/src/components/controls/choose-metric.tsx#L64-L66)

## Fix

Contribute the change to [nextstrain/auspice](https://github.com/nextstrain/auspice), then remove it from the patch after upgrading to an Auspice release that contains it.
