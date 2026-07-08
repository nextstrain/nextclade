# Nested clade handling in muR estimation

## Problem

Real Nextclade trees have hierarchical clade structures (e.g. EV-D68: B -> B1, B2, B3; A -> A1, A2/D). Every node (internal and leaf) carries a `clade_membership` value. The `estimate_mu_r` function groups leaves by their own `clade_membership` label, so a B3 leaf is in group "B3", not "B".

This creates two effects:

1. **Parent clades with few leaves**: Clade "B" has only 4 direct leaves while its sub-clades B1/B2/B3 have 937. The parent clade contributes few pairs to the median.
2. **Short inter-clade distances for nested pairs**: The distance between a "B" leaf and a "B3" leaf is small -- they are from the same lineage. These short distances pull the median downward.

In EV-D68 (10 clades, 1169 leaves), the nesting pattern:

- B3 under B: 738 leaves
- B1 under B: 180 leaves
- A2/D under A: 136 leaves
- B has only 4 direct leaves, A has only 1

## Open question (needs scientist input)

The specification says "typical divergence between sequences from different clades" but does not address hierarchical clade structures. The reference Python prototype has no `mu_r` estimation code and uses hardcoded parameters.

Should the estimator:

- **O1**: Use all clades as-is (current). Parent clades contribute few pairs; nested short distances are a small fraction of total pairs and have limited impact on the median.
- **O2**: Filter to "leaf clades" only (clades with no sub-clades). Drops "B", "A", "pre-ABC", "unassigned" from EV-D68. Removes the nested short-distance pairs entirely.
- **O3**: Collapse nested clades by assigning each leaf to its most specific (deepest) clade only, ignoring ancestor clade labels.

## Current behavior

O1 (no filtering). The median is robust to a small number of short-distance outlier pairs from nested siblings, so the practical impact is expected to be small for trees like EV-D68 where the nested parent clades have few leaves.

## Scope

`packages/nextclade/src/analyze/recombination_estimate.rs`: `estimate_mu_r`, leaf grouping logic.
