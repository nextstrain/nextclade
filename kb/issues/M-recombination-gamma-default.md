# Default gamma of 1/L vs specification guidance

> Calibration question, not a code defect.

## Context

The HMM transition rate `gamma` defaults to `1 / ref_len` in `fn estimate_gamma()` ([`packages/nextclade/src/analyze/recombination_estimate.rs#L184-L186`](packages/nextclade/src/analyze/recombination_estimate.rs#L184-L186)). In the Viterbi decoder each state switch costs `ln((1 - gamma) / gamma)` nats, so `gamma` sets the minimum accumulated mutation evidence needed to open (and close) a recombinant interval, and therefore the minimum detectable tract length.

## Concern

The sources disagree on the value:

- The algorithm notes recommend `gamma << 1/L` (strict inequality) for stickiness.
- The meeting notes state `gamma ~ 1/L`.
- The reference prototype's worked example uses `gamma = 5e-4` at `L = 10000`, i.e. `5/L`.

The implemented `1/L` sits between the notes' `<< 1/L` and the example's `5/L`, stickier than the published figure. Defensible but not empirically calibrated, and it controls which tracts are callable.

## Current state

Documented in [`kb/decisions/recombination-detection.md`](../decisions/recombination-detection.md), which defends `gamma < 0.5` as the enforced invariant and `1/L` as a conservative default. `gamma` is overridable in `pathogen.json`.

## Directions to investigate

- Run a minimum-detectable-tract analysis: a fixed dense block of length `k` at genome scale, sweeping `gamma` over `{1/L, 5/L, ...}`, recording the smallest `k` that decodes.
- Validate the default against known recombinant and non-recombinant sequences on the target datasets before relying on it broadly (detection is on by default).
- Record the resulting false-positive/false-negative characterization in the decision record, and adjust the default or expose a multiplier if short-tract sensitivity matters.
