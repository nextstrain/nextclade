# No minimum region length: alignment artifacts surface as high-confidence micro-calls

> False-positive mode: no minimum region length, so a handful of clustered substitutions next to a coverage hole produces a high-confidence micro-call.

## Context

Decoded recombinant runs are extracted and trimmed to covered endpoints ([`packages/nextclade/src/analyze/recombination.rs#L34-L85`](packages/nextclade/src/analyze/recombination.rs#L34-L85)), then summarized into regions ([`packages/nextclade/src/analyze/recombination.rs#L313-L347`](packages/nextclade/src/analyze/recombination.rs#L313-L347)). There is no minimum-length filter: any run the Viterbi decoder marks recombinant, no matter how short, becomes a reported region.

Biological recombination produces segments of hundreds of nucleotides or more. A few substitutions packed into adjacent positions is almost always a local misalignment -- typically at the edge of a deletion or long `N` run where the aligner places a diverged stretch as dense substitutions.

## Concern

A short substitution cluster produces enough per-`Mut` evidence to open a recombinant interval. Forward-backward scores it near 1.0 (the marginal saturates inside the cluster), so the output is indistinguishable from a genuine long-range call.

Observed: `OU125106` (SC2 orfs) reports a 62 nt region (`5283-5345`) at confidence 0.995. Seven substitutions in eight consecutive positions, immediately adjacent to a 962 nt missing run (`5345-6307`). That's an alignment artifact, not seven independent mutations.

The design notes mentioned a "minimal recombinant region length" parameter but it was not implemented.

## Current state

Correct against the specification, which imposes no minimum length. `minPrivateSubsToRun` gates on whole-sequence substitution count, not per-region length, so it does not suppress a short dense cluster on an otherwise divergent sequence.

## Directions to investigate

- Add a configurable minimum region length (nucleotides) below which a decoded interval is dropped, defaulting to a value consistent with plausible recombination segment sizes.
- Optionally treat runs of adjacent substitutions as a single event (or as missing) before decoding, mirroring how deletions are collapsed, so misalignment does not inflate local density.
- Reconsider whether a region abutting a large missing run should require covered evidence on both flanks before it is reported.
