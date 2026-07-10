# Whole-sequence recombinant calls on globally divergent queries

> The model has no localization constraint, so a uniformly divergent query decodes as recombinant along its entire length. Correct against spec, but scientifically wrong.

## Context

The detector decodes recombinant intervals with a two-state Viterbi decoder under a uniform state prior and symmetric transitions ([`packages/nextclade/src/analyze/recombination/decode.rs`](packages/nextclade/src/analyze/recombination/decode.rs)). Per-site emission evidence is `ln(muR/muW)` toward recombinant for a `Mut` and `ln((1-muW)/(1-muR))` toward wildtype for a `Ref` ([`packages/nextclade/src/analyze/recombination/params.rs`](packages/nextclade/src/analyze/recombination/params.rs)).

Recombination is a _localized_ elevation: a segment from a different parent, flanked by wildtype. The model encodes no flanking requirement. An all-recombinant path pays no switch cost.

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

Practical effect: divergent queries (undersampled clade, novel variant, low-quality assembly) get flagged as "putative recombinant" when they are only _distant from their parent_. Detection is on by default for every tree-bearing dataset.

## Current state

Correct against spec -- the prototype likewise has no localization constraint. `muW`/`muR` overrides shift `d*` but cannot express "must be flanked by wildtype".

## Directions to investigate

- Require a recombinant interval to be bounded by wildtype on at least one side, or reject calls whose span approaches the covered alignment length (a whole-genome "region" is not a recombination signal).
- Compare a query's per-region density against its own genome-wide background rather than against a dataset-fixed `muW`, so that a uniformly divergent query has no elevated region.
- Add a validation pass on representative non-recombinant but divergent queries per dataset; record the whole-sequence-call rate as a false-positive proxy.
