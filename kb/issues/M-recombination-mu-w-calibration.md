# muW calibration: reference-panel terminal branches vs query divergence

> Calibration concern, not a code defect.

## Context

`muW` = `P(site mutated | wildtype)`, estimated as mean terminal branch length / reference length in `fn estimate_mu_w()` ([`packages/nextclade/src/analyze/recombination/estimate.rs`](packages/nextclade/src/analyze/recombination/estimate.rs)).

## Concern

The estimate comes from reference-panel terminal branches but is applied to query-to-parent divergence -- a different distribution:

- Reference trees are deliberately subsampled to span diversity, so their terminal branches can be systematically longer than a typical query's parent-relative divergence, over-estimating `muW` and suppressing true recombinant calls.
- A tight, monophyletic reference panel can have terminal branches shorter than submission divergence, under-estimating `muW` so ordinary queries decode as recombinant.

The discriminative signal is `ln(muR / muW)`, so a biased `muW` shifts the false-positive/false-negative balance across the entire dataset -- driven by panel composition, not biology.

## Current state

Follows the specified heuristic. Override: datasets can set `muW` explicitly in `pathogen.json`.

## Directions to investigate

- Validate empirically on the target datasets: compare the estimated `muW` against the observed private-substitution density of known non-recombinant queries; if they diverge materially, prefer the observed query background.
- Consider a sensitivity/estimator test that scales terminal branches and records the shift in decoded-region count on a fixed query.
- Decide whether to recommend explicit `muW` overrides for datasets whose reference panel is not representative of submission divergence.
