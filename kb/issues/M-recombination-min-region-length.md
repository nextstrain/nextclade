# No minimum region length: alignment artifacts surface as high-confidence micro-calls

> Records a false-positive mode driven by alignment noise. The decoder is correct; the reporting path applies no lower bound on region length, so a handful of clustered substitutions next to a coverage hole is emitted as a confident recombinant region.

## Context

Decoded recombinant runs are extracted and trimmed to covered endpoints ([`packages/nextclade/src/analyze/recombination.rs#L34-L85`](packages/nextclade/src/analyze/recombination.rs#L34-L85)), then summarized into regions ([`packages/nextclade/src/analyze/recombination.rs#L313-L347`](packages/nextclade/src/analyze/recombination.rs#L313-L347)). There is no minimum-length filter: any run the Viterbi decoder marks recombinant, no matter how short, becomes a reported region.

A biological recombination breakpoint delimits a segment of hundreds of nucleotides or more. A run of a few substitutions packed into a few adjacent positions is not recombination; it is almost always a local misalignment, typically at the edge of a deletion or a long `N` run where the aligner places a diverged stretch as dense substitutions.

## Concern

A short cluster of substitutions produces enough per-`Mut` evidence to open a recombinant interval, and forward-backward then scores it near 1.0 because the marginal is saturated inside the cluster. The result is a tiny region reported with high confidence, indistinguishable in the output from a genuine long-range call.

Observed instance (SARS-CoV-2 orfs example sequence, data repository tree): `OU125106` reports a 62 nt region (`5283-5345`) at confidence 0.995. Its substitutions in that window are `5337, 5338, 5339, 5341, 5342, 5343, 5344`: seven substitutions in eight consecutive positions, immediately adjacent to a 962 nt missing run (`5345-6307`). Seven near-consecutive substitutions are an alignment artifact, not seven independent mutational events.

The design notes raised a "minimal recombinant region length" as a possible parameter but it was not implemented, so there is no guard against this class of call.

## Current state

Correct against the specification, which imposes no minimum length. `minPrivateSubsToRun` gates on whole-sequence substitution count, not per-region length, so it does not suppress a short dense cluster on an otherwise divergent sequence.

## Directions to investigate

- Add a configurable minimum region length (nucleotides) below which a decoded interval is dropped, defaulting to a value consistent with plausible recombination segment sizes.
- Optionally treat runs of adjacent substitutions as a single event (or as missing) before decoding, mirroring how deletions are collapsed, so misalignment does not inflate local density.
- Reconsider whether a region abutting a large missing run should require covered evidence on both flanks before it is reported.
