# Private-mutation QC rule ignores sequence coverage

> The rule gives a fragment the same mutation budget as a complete genome.

## Context

The private-mutation QC rule ([`packages/nextclade/src/qc/qc_rule_private_mutations.rs`](../../packages/nextclade/src/qc/qc_rule_private_mutations.rs)) computes a weighted total of private mutations and scores it as `(total - typical) * 100 / cutoff`. The dataset sets `typical` and `cutoff` in `qc.privateMutations` for a full-length genome.

## Concern

The rule does not depend on how much of the genome the sequence covers. A fragment that covers 10% of the genome gets the same `typical` and `cutoff` as a complete genome, so the rule is lenient on fragments and on sequences with long missing runs.

The rest-of-sequence check of recombination detection scales `typical` and `cutoff` by the covered fraction of the genome (see [kb/decisions/recombination-detection.md](../decisions/recombination-detection.md)). The scientific review suggests that the same scaling may be useful for the regular rule.

## Current state

No scaling. A change alters QC scores and statuses of shipped datasets, so it needs a decision by the team before implementation.

## Directions to investigate

- Scale `typical` and `cutoff` by the covered fraction of the genome, and measure the change in QC statuses on the example sequences of the main datasets
- Decide whether datasets need a setting to keep the current behavior
