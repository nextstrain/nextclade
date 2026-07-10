# No confidence threshold on reported regions

> Confidence annotates but never filters. A coin-flip call is emitted identically to a near-certain one.

## Context

Region boundaries come from the hard Viterbi state assignment ([`packages/nextclade/src/analyze/recombination/decode.rs`](packages/nextclade/src/analyze/recombination/decode.rs)). Forward-backward then computes a per-region mean posterior `P(recombinant)` as a confidence score ([`packages/nextclade/src/analyze/recombination/forward_backward.rs`](packages/nextclade/src/analyze/recombination/forward_backward.rs)), attached to each region ([`packages/nextclade/src/analyze/recombination/result.rs`](packages/nextclade/src/analyze/recombination/result.rs)). Every Viterbi-decoded region is reported regardless of its confidence ([`packages/nextclade/src/run/nextclade_run_one.rs#L442-L467`](packages/nextclade/src/run/nextclade_run_one.rs#L442-L467)).

## Concern

Confidence near 0.5 means the posterior is split evenly -- ambiguous evidence. Such a region is emitted identically to a confidence-0.99 region across all output formats. Consumers cannot distinguish a coin-flip from a strong call without applying their own cutoff.

Observed instance (SARS-CoV-2 orfs example sequence, data repository tree): `USA/AR-CDC-ASC210377904/2021` reports a 4966 nt region at confidence 0.60, alongside a 216 nt region at confidence 0.9995 on the same sequence. Both are surfaced with equal prominence.

## Current state

Correct against spec: confidence was introduced as an annotation, not a filter.

## Directions to investigate

- Add an optional confidence cutoff in `pathogen.json` below which a region is dropped (or marked low-confidence rather than dropped), so ambiguous calls do not clutter the default output.
- Alternatively surface confidence more prominently in the viewer and tabular output so consumers can filter, without changing what is reported.
- Decide whether Viterbi membership or posterior-marginal membership should define regions when the two disagree; a posterior cutoff would make the confidence the primary gate.
