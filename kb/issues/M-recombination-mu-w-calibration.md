# muW calibration: reference-panel terminal branches vs query divergence

> For further investigation and discussion. This records a scientific calibration concern, not a code defect; the implementation follows the documented heuristic.

## Context

The wildtype emission probability `muW` is the model's `P(site mutated relative to the parent | wildtype)`. It is estimated as the mean terminal branch length of the reference tree, divided by the reference length, in `fn estimate_mu_w()` ([`packages/nextclade/src/analyze/recombination_estimate.rs#L189-L201`](packages/nextclade/src/analyze/recombination_estimate.rs#L189-L201)), per the tree-based heuristic recorded in [`kb/decisions/recombination-detection.md`](../decisions/recombination-detection.md).

## Concern

The distribution the estimate is drawn from (reference-panel terminal branches) is not the same as the distribution it is applied to (the divergence of a freshly submitted query to its inferred attachment point):

- Reference trees are deliberately subsampled to span diversity, so their terminal branches can be systematically longer than a typical query's parent-relative divergence, over-estimating `muW` and suppressing true recombinant calls.
- A tight, monophyletic reference panel can have terminal branches shorter than submission divergence, under-estimating `muW` so ordinary queries decode as recombinant.

The decoder's per-`Mut` discriminative signal is `ln(muR / muW)`, so a biased `muW` shifts the false-positive/false-negative balance across an entire dataset, driven by reference-panel composition rather than biology. Detection is on by default, so every tree-bearing dataset inherits whatever bias its panel carries.

## Current state

Follows the specified heuristic and is documented. The override path exists: a dataset can set `muW` explicitly in `pathogen.json`.

## Directions to investigate

- Validate empirically on the target datasets: compare the estimated `muW` against the observed private-substitution density of known non-recombinant queries; if they diverge materially, prefer the observed query background.
- Consider a sensitivity/estimator test that scales terminal branches and records the shift in decoded-region count on a fixed query.
- Decide whether to recommend explicit `muW` overrides for datasets whose reference panel is not representative of submission divergence.
