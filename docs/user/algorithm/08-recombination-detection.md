# 8. Recombination detection

Recombination produces a genome assembled from segments of two or more distinct parents. Against the inferred parent, such a sequence has a characteristic pattern: one region matches closely (few mutations), another diverges strongly (many mutations), because it actually descends from a different lineage.

Nextclade detects these regions and reports them as **putative recombinant** intervals. Detection is informational -- it does not affect clade assignment, phylogenetic placement, or QC scoring.

## Model

A two-state [hidden Markov model](https://en.wikipedia.org/wiki/Hidden_Markov_model) decoded with the [Viterbi algorithm](https://en.wikipedia.org/wiki/Viterbi_algorithm). The hidden states:

- **wildtype** -- the sequence matches its parent (nearest node on the reference tree); mutations are sparse.
- **recombinant** -- the sequence diverges from its parent; mutations are dense.

Each reference position yields one observation relative to the parent:

- **mutated** -- a private substitution (difference from parent, including reversions).
- **not mutated** -- a covered position identical to the parent.
- **missing** -- no comparable information (deletion, `N`, ambiguous character, or position outside the aligned region). The model carries the current state across these.

Each maximal run of the recombinant state becomes one reported interval, trimmed to start and end on a covered position.

Based on the [`recomb_inference`](https://github.com/mmolari/recomb_inference) prototype and Nextclade issue [#1768](https://github.com/nextstrain/nextclade/issues/1768). See also the [algorithm notes](https://github.com/mmolari/recomb_inference/blob/main/notes/n01_algorithm.typ) and the [prototype implementation](https://github.com/mmolari/recomb_inference/blob/main/code/recomb_inference/viterbi_recombination.py).

## Parameters

Three dataset-specific parameters:

- `gamma` -- probability of switching state between adjacent positions. Lower values require longer dense regions before calling a recombinant interval.
- `muW` -- probability of mutation in the wildtype state (background divergence from parent).
- `muR` -- probability of mutation in the recombinant state (expected mutation density inside a recombinant region).

Each can be set in the [pathogen configuration](../input-files/05-pathogen-config.md). Unset parameters are estimated from the reference:

- `gamma` defaults to `1 / L` (reference length). A single state switch then costs ~`ln L`, so only sustained dense stretches open a recombinant interval.
- `muW` -- mean terminal branch length of the reference tree (substitutions per site).
- `muR` -- median pairwise substitution distance between leaves of different clades (per site).

Detection requires a reference tree and at least two clades. When parameters cannot be estimated and are not supplied, detection is skipped. The effective parameters are reported once per run.

## Output

Per sequence: list of putative recombinant intervals (reference coordinates), number of intervals, total length, and longest interval length. See [output columns](../output-files/04-results-tsv.md) and the [results table](../nextclade-web/analysis-results-table.md).

## Limitations

- Identifies _where_ a sequence diverges from its parent, not the donor lineages.
- Recombination between closely related lineages produces few distinguishing mutations and may go undetected.
- Dense sequencing artifacts can resemble short recombinant regions.
