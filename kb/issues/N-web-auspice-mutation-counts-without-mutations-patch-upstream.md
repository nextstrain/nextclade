# Auspice offers mutation-count branch lengths for genes without mutations

## Problem

Auspice 3.2.0 offers a branch length by the cumulative count of mutations for the genome and for every CDS of the genome map, whether or not the tree has a mutation in it. A count without any valid mutation on the tree places every node at zero, so the tree draws as a vertical line. A second tree with another genome map, such as an influenza NA tree next to an HA tree, has the same problem: Auspice checks the branch lengths of the second tree against the genome map of the main tree, so a CDS of the main tree (for example `HA1`) stays selectable and the second tree draws all its nodes at zero.

Nextclade fixes this in the Bun patch of Auspice, `packages/nextclade-web/patches/auspice@3.2.0.patch`: `findAvailableDistanceMeasures()` offers the count of the genome or of a CDS only when at least one branch of the tree has a valid mutation in it (`validMutation()`: not `N` or a gap for nucleotides, not `X` for amino acids).

## Code

- Mutation-count measures: [util/computeDistanceMetric.ts#L110-L118](https://github.com/nextstrain/auspice/blob/db211cc6b44296d92529844502a95a3e68710449/src/util/computeDistanceMetric.ts#L110-L118)
- Measures of the second tree: [actions/recomputeReduxState.js#L482-L487](https://github.com/nextstrain/auspice/blob/db211cc6b44296d92529844502a95a3e68710449/src/actions/recomputeReduxState.js#L482-L487)

## Fix

Contribute the change to [nextstrain/auspice](https://github.com/nextstrain/auspice), then remove it from the patch after upgrading to an Auspice release that contains it.
