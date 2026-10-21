# 1. Sequence alignment

In order for sequences to be analyzed, they need to be arranged in a way that allows for comparing homologous regions. This process is called [sequence alignment](https://en.wikipedia.org/wiki/Sequence_alignment).

Nextclade performs pairwise alignment of the provided (query) sequences against a given reference (root) sequence using a banded local alignment algorithm with affine gap-cost. The band width and rough relative positions of query and reference sequence are determined through seed matching. Seed matching consists of finding several small fragments, *seeds*, where the reference and query sequence match exactly. Nextclade finds these matches using an [FM-index](https://en.wikipedia.org/wiki/FM-index). To improve sensitivity, Nextclade searches for exact matches while ignoring every third base, that is a matching pattern like `XX.XX.XX.XX` where `X` is matched and `.` ignored. This pattern allows to ignore the majority of synonymous mutations that happen at the third position in codons. The number of seeds, as well as their length, spacing are configurable in [Nextclade CLI](../nextclade-cli/index.rst).
Seed matches are then extended while allowing for a small number of mismatches in a sliding window (configurable) and pruned to an optimal chain of seeds in ascending order on query and reference sequences.

If the resulting chain of seeds covers a sufficient fraction of the query sequence (configurable), the relative positions of these seeds are used to estimate the shift of the query sequence relative to the reference and the amount of insertion/deletions between successive seeds.
Nextclade does not align a query sequence whose seed chain links distant parts of the reference, and reports an error for it. For each pair of successive seeds, the implied deletion is the distance between the seeds on the reference minus their distance on the query. The sequence is rejected when an implied deletion is longer than a multiple of the query length (`--max-seed-chain-deletion-ratio`, `maxSeedChainDeletionRatio` in `alignmentParams` of `pathogen.json`, default 10), and the parts of the chain before and after this deletion each hold at least a fraction of the total seed length (`--min-seed-chain-part-cover`, `minSeedChainPartCover`, default 0.2). Such a chain occurs, for example, for an mpox sequence from the inverted terminal repeats, which matches both ends of the genome: its alignment would contain one deletion of almost the whole genome, and its alignment band would need several GB of memory. A part with fewer seeds is not considered, because terminal gaps are free and such a part usually stays out of the final alignment. The `short-sequences` preset turns this check off, because its short seeds can also match far from the true position of a short query.
These estimates are used to construct a band of variable width that covers the full alignment with high probability. The width of this band is configurable via parameters that determine the width around insertions or deletions between seeds (`--excess-bandwidth`) and at the end of the sequence (`--terminal-bandwidth`). The width of the band along the extended seed matches is controlled by the number of mismatches allowed during seed extension.
The alignment algorithm is a variation of the classic [Smith–Waterman](https://en.wikipedia.org/wiki/Smith%E2%80%93Waterman_algorithm) algorithm restricted to the band.
If the optimal alignment path hits the boundary of the allowed band, the parameters controlling the band are relaxed and alignment is redone.
To prevent Nextclade from running out of memory during the alignment process, the total area of the band is limited to a configurable maximum (`--max-band-area`) and a query sequence that requires a larger band will be skipped.
A query sequence is also skipped with an error when the memory for its alignment matrix cannot be allocated. This can happen in Nextclade Web, where each analysis thread has at most 4 GiB of memory, for a band below the limit.
The number of retries with a relaxed band is configurable (`--max-alignment-attempts`). When the alignment still touches the band boundary and no wider band can be used, because the wider band exceeds the band area limit or does not fit into memory, because retries are disabled (`--max-alignment-attempts` is 0), or because all retries are used while the alignment score still rises, Nextclade keeps the last alignment and reports a warning with the reason (see [Errors and warnings](../output-files/errors-and-warnings.md)).


Nextclade implements a few pre-defined alignment parameter presets. Currently available values are:
  - `default`: Suitable for aligning very similar sequences (this is the default)
  - `high-diversity`: Suitable for more diverse viruses
  - `short-sequences`: Suitable for short and partial sequences

This is an experimental feature. Presets other than default are subject to change.

A preset can be selected in two places. If both are set, the CLI argument is used:
 - the `--alignment-preset` argument of the `run` command of Nextclade CLI
 - `alignmentPreset` in `alignmentParams` of the dataset's [pathogen config file](../input-files/05-pathogen-config), if defined by the dataset author. This also applies in Nextclade Web

Other than built-in presets, alignment parameters can be provided:
 - (if a [dataset](../datasets) is used) by the dataset's [pathogen config file](../input-files/05-pathogen-config), if defined by the dataset author
 - using CLI arguments (see `nextclade run --help` or [in "CLI reference" section](../nextclade-cli/reference.md#nextclade-run))

If a parameter present in multiple sources, the order of preference of parameters is as follows:
 - built-in preset
 - dataset's pathogen config file (overrides parameters in preset)
 - CLI arguments (overrides parameters in preset and in dataset config)

A parameter that the dataset's pathogen config file sets therefore also overrides a preset selected with the `--alignment-preset` CLI argument. For example, with `--alignment-preset high-diversity` and `"penaltyGapOpen": 8` in the pathogen config file, `penaltyGapOpen` is 8, and all other parameters that the pathogen config file does not set have the values of the `high-diversity` preset.


After alignment, Nextclade strips insertions relative to the reference from the aligned sequences and lists them in a separate file.
As a result, each sequence is reported in coordinates of the reference sequence.

The algorithm aims to be sufficiently fast for running in the internet browser of an average consumer computer, by trading width of the alignment band for improved runtime performance. We found that it works well for most sequences, but for a minority of sequences indel variation not captured by seed matches might result in suboptimal alignments.

By default, alignment is only attempted on sequences longer than 100 nucleotides (configurable), because alignment of shorter sequences may be unreliable.
If alignment fails, Nextclade will optionally attempt to align the reverse complemented sequence.

Nextclade can use a genome annotation to make the alignment more interpretable. Sometimes, the placement of a sequence deletion or insertion is ambiguous as in the following example. The gap could be moved forward or backward by one base with the same number of matches:

```
Reference  : ... | GTT | TAT | TAC | ...
Alignment 1: ... | GTT | --- | TAC | ...
Alignment 2: ... | GT- | --T | TAC | ...
Alignment 3: ... | GTT | T-- | -AC | ...
```

If a genome annotation is provided, Nextclade will use a lower gap-open-penalty at the beginning of a codon (delimited by the `|` characters in the schema above), thereby locking a gap in-frame if possible. A gap that starts inside of a coding sequence (CDS) pays a higher gap-open-penalty than a gap outside of all CDSs, so Nextclade preferentially places gaps outside of CDSs in case of ambiguities.

When several placements of a gap have the same score, the `gapAlignmentSide` alignment parameter selects one: `left` (the default) moves the aligned bases to the left and places the gap at its 3'-most position, `right` places the gap at its 5'-most position.

The codon-aware penalties apply at the position where a gap starts. A deletion that starts before a CDS and ends inside of it pays only the gap-open-penalty of its first base, which is outside of the CDS. If such a deletion has an equally good placement outside of the CDS, `gapAlignmentSide` decides between them, and the deletion can remove the first bases of the CDS in reference coordinates: the start codon of a forward-strand CDS, or the last codon of a reverse-strand CDS. The `penaltyGapEnterCds` alignment parameter (CLI argument `--penalty-gap-enter-cds`) adds a penalty to a deletion that extends from a position outside of all CDSs into a CDS:

- A value of 1 or more keeps such deletions outside of the CDS when an equally good placement exists
- A value greater than `penaltyGapOpenInFrame` minus `penaltyGapOpen` also makes a deletion that cuts into a CDS more costly than an in-frame deletion inside of the CDS
- A value greater than `scoreMatch` plus `penaltyMismatch` can make Nextclade add a substitution to avoid a deletion that enters a CDS

The default value is 0, which adds no penalty. Insertions are not affected.

Alignment may fail if the query sequence is too divergent from the reference sequence, i.e. if there are many differences between the query and reference sequence. The seed matching step may then not be able to find a sufficient number of similar regions. This may happen due to usage of an incorrect reference sequence (e.g. from a different virus or a virus from a different host organism), if analysed sequences are of very low quality (e.g. containing a lot of missing regions or with a lot of ambiguous nucleotides) or are very short compared to the reference sequence. Alignment also fails when the seeds of the query sequence match distant parts of the reference, for example for a sequence from repeated regions, a chimeric or concatenated sequence, or with an incorrect reference sequence (see the seed chain check above).

> ⚠️ Analysis steps that follow the step alignment will ignore sequence regions before and after the alignment range, as well as unsequenced regions (consecutive gap (`-`) character ranges on the 5' and 3' ends). The exact alignment range is indicated as "Alignment range" in the analysis results table of [Nextclade Web](../nextclade-web/index.rst) and `alignmentStart` and `alignmentEnd` in the output files of [Nextclade Web](../nextclade-web/index.rst) and [Nextclade CLI](../nextclade-cli/index.rst).

### Results

The alignment step results in aligned nucleotide sequences, which are being produced in the form of a fasta files.

This file is written by [Nextclade CLI](../nextclade-cli/index.rst) and can be downloaded in the "Download" dialog of [Nextclade Web](../nextclade-web/index.rst).
