# Choose the muR estimator: founder distance vs inter-clade sequence divergence

**Status**: resolved (branch `fix/mu-r-leaf-distance`)

## Resolution

Implemented A1 (inter-clade leaf-to-leaf divergence) with B1 (exhaustive pairing) and C1 (median). The estimator now computes the median pairwise substitution distance between leaves of different clades, matching the specification in issue #1768 and the meeting notes.

Remaining open questions filed as issues:

- `kb/issues/N-recombination-mu-r-exhaustive-pairing.md`: B1 vs B2 (exhaustive vs sampled pairing for large trees)
- `kb/issues/M-recombination-mu-r-nested-clades.md`: how nested clade hierarchies affect the estimate
- `kb/issues/N-recombination-mu-r-median-vs-mean.md`: C1 vs C2 (median vs mean as the central tendency)

## Original Motivation

`muR` is the recombination HMM's emission probability for the recombinant state: the expected mutation density, relative to the inferred parent, inside a recombinant tract. Issue #1768 and the meeting notes define it as "the typical divergence between two sequences belonging to different clades." It sets the model's discriminative power: the per-mutated-site log-odds in favor of the recombinant state is `ln(muR / muW)`, so an underestimate of `muR` shrinks the signal, requires longer denser tracts before an interval is called, and can push `muR <= muW`, which disables detection for the dataset.

The previous estimator computed the median substitution distance between clade **founders** (each clade's most recent common ancestor), not between sequences. Founder-to-founder distance omits the branch length from each founder down to its sampled tips, so it was a lower bound on inter-clade sequence divergence and biased `muR` downward.

## Scope

- `packages/nextclade/src/analyze/recombination_estimate.rs`: `estimate_mu_r` and helpers
- `docs/user/algorithm/08-recombination-detection.md`: updated description

## Validation

- Test fixture `nested_clade_tree` demonstrates that the leaf-based estimate (0.09) is substantially higher than the old founder-based estimate would have been (0.05), well above `muW` (0.04).
- Test fixture `two_clade_tree` confirms the leaf-based estimate (0.05) exceeds the old founder-based value (0.03).
- All existing tests updated and passing.
