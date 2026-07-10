# Insertion counts calibrate an HMM that never observes insertions

> Calibration concern, not a code defect. The estimator counts an event the decoder cannot observe. The decision record contradicts itself on this point.

## Context

`muW` and `muR` are calibrated from per-branch mutation counts on the reference tree. `fn nuc_mutation_count()` counts substitutions and insertions, excluding only deletions ([`packages/nextclade/src/analyze/recombination/estimate.rs`](../../packages/nextclade/src/analyze/recombination/estimate.rs)).

The decoder sees a different event set. `Mut` comes from `private_substitutions` only ([`packages/nextclade/src/run/nextclade_run_one.rs#L447-L453`](../../packages/nextclade/src/run/nextclade_run_one.rs#L447-L453)), and `fn build_observations()` emits `Ref`, `Mut`, or `Missing` per reference position -- no insertion channel ([`packages/nextclade/src/analyze/recombination/observations.rs`](../../packages/nextclade/src/analyze/recombination/observations.rs)). The upstream prototype is the same: binary substitution vector, no insertions.

## Concern

`muW`/`muR` are estimated from substitutions + insertions but applied to substitutions only. Emission probabilities should describe the same event the decoder scores.

Nextclade-built trees carry substitutions only, so they're unaffected. Externally produced trees (augur/TreeTime) can carry insertion tokens, inflating both rates for a decoder that never sees insertions.

The decision record says "Both `muW` and `muR` count substitutions only" and, in the same paragraph, "Insertions remain counted" ([`kb/decisions/recombination-detection.md#L57`](../decisions/recombination-detection.md#L57)). The estimator implements the second clause. `test_recombination_estimate_counts_insertions_as_mutations` locks this in.

## Current state

Estimator counts insertions, locked by a test. Override: datasets can set `muW`/`muR` explicitly in `pathogen.json`.

## Directions

- If the decoder observes only substitutions, restrict `nuc_mutation_count()` to non-gap-to-non-gap tokens, reconcile the decision record, replace the insertion-counting test with one asserting an insertion token like `"-10A"` does not change `muW`/`muR`.
- If insertions are deliberately recombination evidence, add an insertion observation channel to `build_observations()` and the decoder, update docs, parity scope, schemas, tests.
- Quantify the effect on augur/TreeTime trees: compare `muW`/`muR` and decoded regions with insertions counted vs excluded.
