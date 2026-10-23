# Auspice never colors a second tree by genotype

## Problem

When a second tree is shown, Auspice 3.1.0 computes the genotypes of the second tree only when both trees have the same genome map (`metadata.identicalGenomeMapAcrossBothTrees`). `instantiateSecondTree()` calls `updateMetadataStateViaSecondTree()` with a copy of the metadata (`{...metadata}`) and discards the copy, so the flag is never set, and a coloring by genotype leaves the second tree in the color of missing values even when the genome maps are identical.

On the tree page this matters only for two trees with the same genome annotation. For the segments of a segmented virus, such as influenza HA and NA, the genome maps differ, and the help text of the "Second tree" select says that a coloring by genotype colors the first tree only.

## Code

- Discarded comparison: [actions/recomputeReduxState.js#L1154](https://github.com/nextstrain/auspice/blob/v3.1.0/src/actions/recomputeReduxState.js#L1154)

## Fix

Report the defect to [nextstrain/auspice](https://github.com/nextstrain/auspice), so that `instantiateSecondTree()` keeps the metadata that the comparison updates.
