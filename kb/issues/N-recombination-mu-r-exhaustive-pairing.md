# Performance: exhaustive inter-clade leaf pairing in muR estimation

## Problem

`estimate_mu_r` computes pairwise distances between all leaves of different clades and takes the median. Two coupled costs, both quadratic in leaf count `N`:

1. The pair count is `O(N^2)`, and each pair calls an MRCA routine that walks to the root (`O(depth)`), giving `O(N^2 * depth)` time.
2. Every pairwise distance is pushed into a `Vec<f64>` before the median is taken, so peak memory is `O(N^2)`.

Real dataset sizes (from `nextclade_data`):

- EV-D68: 1169 leaves, 10 clades -> 383,572 inter-clade pairs
- H5 all-clades: 432 leaves, 57 clades -> 90,907 pairs
- H5 2.3.2.1: 1654 leaves, 10 clades -> larger still

This runs once at dataset load, not per-sequence, so it does not affect per-sequence throughput. Current impact is likely acceptable but should be profiled on the largest trees.

## Options

Three orthogonal axes. The per-pair-cost and memory axes preserve the exact median; only pair-count reduction trades accuracy.

### Axis A: pair count (accuracy tradeoff)

- A1 (current): exhaustive pairing. Exact median, deterministic. `O(N^2)` pairs.
- A2: subsample a fixed number of leaf pairs per clade combination (e.g. `K = 100`) with a deterministic seed. Caps cost at `C(C-1)/2 * K` pairs. The median converges quickly for well-behaved distance distributions, but the result is an approximation.

### Axis B: per-pair MRCA cost (exact)

- B1 (current): walk each leaf to the root per pair, `O(depth)` per pair, plus a per-`a` ancestor-set rebuild.
- B2: preprocess LCA once (Euler tour + sparse-table, binary lifting, or Tarjan offline), then each MRCA is `O(1)` / `O(log N)`. Removes the `O(depth)` factor and keeps the exact median. Independent of Axis A.
- B3 (minimal): hoist so each leaf's ancestor set is built once total (not once per clade-group pairing) and root distances are cached. A smaller constant-factor win short of full LCA preprocessing.

### Axis C: distance materialization (exact, memory)

- C1 (current): collect all pairwise distances into a `Vec<f64>`, `O(N^2)` memory.
- C2: stream the median from a bounded counting histogram. Inter-clade distances are integer substitution counts over a small range, so a fixed-size count array yields the exact median in `O(1)` memory (in the distance range), independent of the pair count. Removes the quadratic allocation regardless of Axis A or B.

## Recommendation

Profile on the largest production trees (H5 all-clades, EV-D68) before optimizing. If load time and memory are acceptable, keep A1/B1/C1 for simplicity. If not, prefer the exact axes first -- B2 (LCA preprocessing) for time and C2 (histogram median) for memory, since both keep the exact median. Fall back to A2 (subsampling) only if the exact-but-faster path is still too slow, and then with a named constant for the sample size.

## Scope

`packages/nextclade/src/analyze/recombination/estimate.rs`: `estimate_mu_r` and the MRCA / ancestor helpers (Axis B).
