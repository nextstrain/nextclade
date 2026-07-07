# Whole-sequence recombinant calls on globally divergent queries

> Records a scientific validity concern, not a code defect; the decoder correctly implements the two-state model. The model has no constraint that a recombinant call be _localized_, so a query that is uniformly diverged from its parent decodes as recombinant along its entire length.

## Context

The detector decodes recombinant intervals with a two-state Viterbi decoder under a uniform state prior and symmetric transitions ([`packages/nextclade/src/analyze/recombination.rs#L508-L565`](packages/nextclade/src/analyze/recombination.rs#L508-L565)). Per-site emission evidence is `ln(muR/muW)` toward recombinant for a `Mut` and `ln((1-muW)/(1-muR))` toward wildtype for a `Ref` ([`packages/nextclade/src/analyze/recombination.rs#L271-L278`](packages/nextclade/src/analyze/recombination.rs#L271-L278)).

Recombination is meant to be a _localized_ elevation of mutation density: a segment from a different parent, flanked by wildtype background. The model encodes no such flanking requirement. A single all-recombinant path competes directly with the all-wildtype path, and pays no switch cost because it never switches.

## Concern

Because the wildtype state absorbs `Ref` sites only weakly (`ln((1-muW)/(1-muR))` is tiny when both rates are small), the all-recombinant path overtakes the all-wildtype path once the query's _uniform_ divergence `d` from its parent exceeds

```
d* = ln((1 - muW) / (1 - muR)) / ln(muR / muW)
```

which is far below `muR`. Above `d*` the entire sequence decodes as one recombinant interval, even though the divergence is spread evenly and carries no breakpoint.

Worked thresholds from the tree-estimated parameters of shipped datasets:

- Flu H3N2 HA (`muW ≈ 1.0e-3`, `muR ≈ 2.68e-2`): `d* ≈ 0.008`, i.e. ~14 substitutions across the ~1718 nt segment.
- SARS-CoV-2 orfs (`muW ≈ 1.7e-4`, `muR ≈ 6.4e-3`): `d* ≈ 0.0017`, i.e. ~51 substitutions across the ~30 kb genome.

Observed instances (dataset example sequences, data repository trees):

- Flu H3N2 HA `A/Missouri/19/2022`: 18 private substitutions spread uniformly (positions 35 to 1677); the **entire** `0-1718` segment is reported as one region (confidence ~ 0.79).
- SARS-CoV-2 orfs `USA/AR-CDC-ASC210377904/2021`: 57 private substitutions; a 4966 nt region at confidence ≈ 0.60.

The practical effect: outlier, poorly placed, or simply divergent queries (undersampled clade, novel variant, low-quality assembly) are flagged as "putative recombinant" when they are only _distant from their inferred parent_. Detection is on by default, so every tree-bearing dataset is exposed.

## Current state

The decoder is correct against the prototype specification. The prototype likewise has no localization constraint. `muW`/`muR` overrides in `pathogen.json` shift `d*` but cannot express "must be flanked by wildtype".

## Directions to investigate

- Require a recombinant interval to be bounded by wildtype on at least one side, or reject calls whose span approaches the covered alignment length (a whole-genome "region" is not a recombination signal).
- Compare a query's per-region density against its own genome-wide background rather than against a dataset-fixed `muW`, so that a uniformly divergent query has no elevated region.
- Add a validation pass on representative non-recombinant but divergent queries per dataset; record the whole-sequence-call rate as a false-positive proxy.
