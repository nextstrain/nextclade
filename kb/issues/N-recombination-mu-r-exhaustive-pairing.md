# Performance: exhaustive inter-clade leaf pairing in muR estimation

## Problem

`estimate_mu_r` computes pairwise distances between all leaves of different clades. The number of pairs is $O(N^2)$ where $N$ is total leaf count, and each pair requires an `mrca_pair` call that walks to the root ($O(\text{depth})$).

Real dataset sizes (from `nextclade_data`):

- EV-D68: 1169 leaves, 10 clades -> 383,572 inter-clade pairs
- H5 all-clades: 432 leaves, 57 clades -> 90,907 pairs
- H5 2.3.2.1: 1654 leaves, 10 clades -> larger still

This runs once at dataset load, not per-sequence, so it does not affect per-sequence throughput. Current impact is likely acceptable but should be profiled on the largest trees.

## Options

- **B1 (current)**: exhaustive pairing. Exact median, deterministic. Cost grows quadratically with tree size.
- **B2**: subsample a fixed number of leaf pairs per clade combination (e.g. $K=100$) with a deterministic seed. Caps cost at $C(C-1)/2 \cdot K$ pairs. The median converges quickly for well-behaved distance distributions.

## Recommendation

Profile on the largest production trees (H5 all-clades, EV-D68) before optimizing. If load time is acceptable, keep B1 for simplicity. If not, implement B2 with a named constant for the sample size.

## Scope

`packages/nextclade/src/analyze/recombination_estimate.rs`: `estimate_mu_r`
