# 8. Recombination detection

Recombination produces a genome assembled from segments of two or more distinct parents. Against the inferred parent, such a sequence has a characteristic pattern: one region matches closely (few mutations), another diverges strongly (many mutations), because it actually descends from a different lineage.

Nextclade detects these regions and reports them as **putative recombinant** intervals. Detection is informational -- it does not affect clade assignment, phylogenetic placement, or QC scoring.

Detection runs only for datasets that enable it with `recombination.enabled` in the [pathogen configuration](../input-files/05-pathogen-config.md#recombination), because the model does not fit every pathogen: in a virus whose whole genome carries a high density of private mutations, such as HIV, most calls would be false. Nextclade CLI overrides the dataset in both directions with `--with-recombination` and `--without-recombination`. Without detection, the outputs carry no recombination fields and the results table has no recombination column.

## Model

A two-state [hidden Markov model](https://en.wikipedia.org/wiki/Hidden_Markov_model) decoded with the [Viterbi algorithm](https://en.wikipedia.org/wiki/Viterbi_algorithm). The hidden states:

- **wildtype**: the sequence matches its parent (nearest node on the reference tree); mutations are sparse.
- **recombinant**: the sequence diverges from its parent; mutations are dense.

Each reference position yields one observation relative to the parent:

- **mutated**: a private substitution (difference from parent, including reversions).
- **not mutated**: a covered position identical to the parent.
- **missing**: no comparable information (deletion, `N`, ambiguous character, or position outside the aligned region). The model carries the current state across these.

Each maximal run of the recombinant state becomes one candidate interval, trimmed to start and end on a covered position. The candidates then go through the [checks of the calls](#checks-of-the-calls).

Based on the [`recomb_inference`](https://github.com/mmolari/recomb_inference) prototype and Nextclade issue [#1768](https://github.com/nextstrain/nextclade/issues/1768). See also the [algorithm notes](https://github.com/mmolari/recomb_inference/blob/main/notes/n01_algorithm.typ) and the [prototype implementation](https://github.com/mmolari/recomb_inference/blob/main/code/recomb_inference/viterbi_recombination.py).

## Parameters

Three dataset-specific parameters:

- `gamma`: probability of switching state between adjacent positions. Lower values require longer dense regions before calling a recombinant interval.
- `muW`: probability of mutation in the wildtype state (background divergence from parent).
- `muR`: probability of mutation in the recombinant state (expected mutation density inside a recombinant region).

Each can be set in the [pathogen configuration](../input-files/05-pathogen-config.md). Unset parameters are estimated from the reference:

- `gamma` defaults to `0.01 / L` (`L` = reference length): in many viral species recombinants are rare, so the expected switch rate is far below one per genome. A single state switch then costs about `ln(100 L)`, so only sustained dense stretches open a recombinant interval, and very short calls disappear.
- `muW`: mean terminal branch length of the reference tree (substitutions per site).
- `muR`: median pairwise substitution distance between leaves of different clades (per site).

Detection requires a reference tree and, for the estimates, at least two clades. When detection is enabled and the dataset cannot support it, for example because a parameter cannot be estimated and is not supplied, the dataset fails to load with an error that names the cause. The effective parameters are reported once per run: in the log, and in the `recombinationParams` field of `nextclade.json`.

## Checks of the calls

The decoder marks every stretch of high mutation density. Some of these stretches are not recombinant: short stretches next to missing data, stretches that consist mostly of `N`, and whole sequences that diverge from the tree everywhere, such as divergent queries and short fragments. Nextclade reports a call only when the evidence is strong, at the cost of missing ambiguous cases.

Region checks apply to each candidate interval. A missing site is a site that the model observes as missing: `N`, other ambiguity codes, deletions, placement-masked sites, and sites outside the aligned region.

- The interval is dropped when the fraction of missing sites in its span is above `maxRegionMissingFraction` (default `0.5`).
- Otherwise it is dropped when its span is below `minRegionLength` nucleotides (default `50`).

Sequence checks apply to the intervals that pass the region checks. Either check drops all intervals of the sequence, and the sequence gets no call. The checks run in this order:

1. **Coverage**: the total span of the intervals divided by the span of the aligned region is above `maxRecombinantFraction` (default `2/3`). A sequence that is recombinant almost everywhere carries no localized signal.
2. **Rest of the sequence**: the rest of the sequence must still fit the tree. Nextclade removes the private substitutions and private deletions inside the intervals, and computes the weighted total of the [private mutations QC rule](06-quality-control.md) on the remaining ones, with the weights of `qc.privateMutations`. The rest fails when the weighted total is at least `(typical + cutoff) * Lm / L`, where `Lm` is the number of covered sites outside the intervals and `L` is the reference length. This is the private mutations score with `typical` and `cutoff` each scaled by `Lm / L` reaching 100, so a shorter rest gets a stricter threshold. A sequence without covered sites outside the intervals gives no evidence that it fits the tree, and fails. Placement is not recomputed.

Detection therefore requires the `qc.privateMutations` rule of the dataset.

## Output

Per sequence with a call: list of putative recombinant intervals (reference coordinates), number of intervals, total length, and longest interval length. A sequence without a call has empty recombination fields. See [output columns](../output-files/04-results-tsv.md) and the [results table](../nextclade-web/analysis-results-table.md).

## Limitations

- Identifies _where_ a sequence diverges from its parent, not the donor lineages.
- Recombination between closely related lineages produces few distinguishing mutations and may go undetected.
- Dense sequencing artifacts can resemble short recombinant regions.
- The checks of the calls favor specificity: short fragments, divergent sequences, and sequences that are recombinant over most of their length get no call.
