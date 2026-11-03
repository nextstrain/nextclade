# Auspice never colors a second tree by genotype

## Problem

When a second tree is shown, Auspice 3.2.0 computes the genotypes of the second tree only when both trees have the same genome map (`metadata.identicalGenomeMapAcrossBothTrees`). `instantiateSecondTree()` calls `updateMetadataStateViaSecondTree()` with a copy of the metadata (`{...metadata}`) and discards the copy, so the flag is never set, and a coloring by genotype leaves the second tree in the color of missing values even when the genome maps are identical.

Nextclade fixes this in the Bun patch of Auspice, `packages/nextclade-web/patches/auspice@3.2.0.patch`: `instantiateSecondTree()` returns the copy that the comparison of the genome maps marks. Two trees with the same genome annotation are then both colored by genotype. For trees with different genome maps, such as the segments of influenza, the second tree keeps the color of missing values, as Auspice intends.

## Code

- Discarded comparison: [actions/recomputeReduxState.js#L1173](https://github.com/nextstrain/auspice/blob/db211cc6b44296d92529844502a95a3e68710449/src/actions/recomputeReduxState.js#L1173)
- Returned metadata: [actions/recomputeReduxState.js#L1182](https://github.com/nextstrain/auspice/blob/db211cc6b44296d92529844502a95a3e68710449/src/actions/recomputeReduxState.js#L1182)

## Fix

Contribute the change to [nextstrain/auspice](https://github.com/nextstrain/auspice), then remove it from the patch after upgrading to an Auspice release that contains it.
