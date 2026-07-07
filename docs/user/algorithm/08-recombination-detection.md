# 8. Recombination detection

Recombination occurs when a genome is assembled from segments of two or more genetically distinct parents. In the mutation/parent view such a sequence shows a characteristic pattern: one region matches the inferred parent closely (few mutations), while another region diverges strongly (many mutations), because that region actually descends from a different lineage.

Nextclade detects these regions and annotates them as **putative recombinant** intervals. Detection is informational: it does not affect clade assignment, phylogenetic placement, or the quality control score, and it does not raise a QC flag. Results are reported in a dedicated output field and a dedicated output column.

## Model

Detection uses a two-state [hidden Markov model](https://en.wikipedia.org/wiki/Hidden_Markov_model) decoded with the [Viterbi algorithm](https://en.wikipedia.org/wiki/Viterbi_algorithm). The two hidden states are:

- **wildtype**: the sequence matches its inferred parent (the nearest node on the reference tree), so mutations are sparse;
- **recombinant**: the sequence diverges from its parent, so mutations are dense.

Each reference position is one observation relative to the parent:

- **mutated**: a private substitution (a difference from the parent, including reversions);
- **not mutated**: a covered position identical to the parent;
- **missing**: no comparable information: a deletion, an `N` or ambiguous character, or a position outside the aligned region. Missing positions carry no evidence either way; the model simply carries the current state across them.

The decoded path is a sequence of wildtype and recombinant labels, one per position. Each maximal run of the recombinant state becomes one reported interval, trimmed so it starts and ends on a covered position.

The method and its default parameters follow the prototype and notes by [Marco Molari](https://github.com/mmolari/recomb_inference) and Nextclade issue [#1768](https://github.com/nextstrain/nextclade/issues/1768). See also the [algorithm notes](https://github.com/mmolari/recomb_inference/blob/main/notes/n01_algorithm.typ) and the [prototype implementation](https://github.com/mmolari/recomb_inference/blob/main/code/recomb_inference/viterbi_recombination.py).

## Parameters

The model has three parameters, all specific to a dataset:

- `gamma`: the probability of switching state between adjacent positions. Lower values make the model more conservative, requiring longer dense regions before a recombinant interval is called.
- `muW`: the probability that a position is mutated in the wildtype state (the background divergence of a freshly sampled sequence from its parent).
- `muR`: the probability that a position is mutated in the recombinant state (the expected mutation density inside a recombinant region).

Each parameter can be set explicitly in the dataset [pathogen configuration](../input-files/05-pathogen-config.md); any parameter left unset is estimated from the reference:

- `gamma` defaults to `1 / L`, where `L` is the reference length (following issue #1768). At this value a single state switch costs about `ln L`, so only sustained dense stretches, not a few isolated mutations, open a recombinant interval.
- `muW` is estimated as the mean terminal branch length of the reference tree (in substitutions per site).
- `muR` is estimated as the typical divergence between sequences of different clades (the median pairwise substitution distance between leaves of different clades, per site).

Detection requires a reference tree (to determine the parent) and at least two clades (to estimate `muR`). When the parameters cannot be estimated and are not supplied, detection is skipped for that dataset. The effective parameters actually used are reported once per run.

## Output

For each sequence, Nextclade reports the list of putative recombinant intervals (in reference coordinates) together with summary statistics: the number of intervals, their total length, and the length of the longest interval. See the [output columns](../output-files/04-results-tsv.md) and the [results table](../nextclade-web/analysis-results-table.md).

## Limitations

- Detection identifies _where_ a sequence diverges from its assigned parent; it does not identify the donor lineages, split the sequence, or place the parts separately.
- Sensitivity depends on the parameters and on the divergence between the parents. Recombination between very closely related lineages produces few distinguishing mutations and may go undetected.
- A dense cluster of sequencing artefacts can resemble a short recombinant region. Interpret short intervals with care.
