# No confidence threshold on reported regions

> Records a reporting-quality concern. Region membership is decided by Viterbi; the forward-backward confidence only annotates and never filters, so a near-ambiguous call is emitted identically to a near-certain one.

## Context

Region boundaries come from the hard Viterbi state assignment ([`packages/nextclade/src/analyze/recombination.rs#L508-L565`](packages/nextclade/src/analyze/recombination.rs#L508-L565)). Forward-backward then computes a per-region mean posterior `P(recombinant)` as a confidence score ([`packages/nextclade/src/analyze/recombination.rs#L491-L505`](packages/nextclade/src/analyze/recombination.rs#L491-L505)), attached to each region ([`packages/nextclade/src/analyze/recombination.rs#L313-L347`](packages/nextclade/src/analyze/recombination.rs#L313-L347)). Every Viterbi-decoded region is reported regardless of its confidence ([`packages/nextclade/src/run/nextclade_run_one.rs#L442-L467`](packages/nextclade/src/run/nextclade_run_one.rs#L442-L467)).

## Concern

Confidence near 0.5 means the posterior is split roughly evenly between wildtype and recombinant: the evidence is ambiguous. Such a region is emitted in the same shape as a confidence-0.99 region, in JSON, in the CSV/TSV columns, and in the web viewer. Downstream consumers cannot distinguish a coin-flip call from a strong one without applying their own cutoff, and the default output invites treating both as equally real.

Observed instance (SARS-CoV-2 orfs example sequence, data repository tree): `USA/AR-CDC-ASC210377904/2021` reports a 4966 nt region at confidence 0.60, alongside a 216 nt region at confidence 0.9995 on the same sequence. Both are surfaced with equal prominence.

## Current state

Correct against the specification: confidence was introduced as a reliability annotation, deliberately not as a filter. No cutoff is applied anywhere in the pipeline or output.

## Directions to investigate

- Add an optional confidence cutoff in `pathogen.json` below which a region is dropped (or marked low-confidence rather than dropped), so ambiguous calls do not clutter the default output.
- Alternatively surface confidence more prominently in the viewer and tabular output so consumers can filter, without changing what is reported.
- Decide whether Viterbi membership or posterior-marginal membership should define regions when the two disagree; a posterior cutoff would make the confidence the primary gate.
