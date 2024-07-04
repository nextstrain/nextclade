# 1. Sequence alignment

In order for sequences to be analyzed, they need to be arranged in a way that allows for comparing homologous regions. This process is called [sequence alignment](https://en.wikipedia.org/wiki/Sequence_alignment).

Nextclade performs pairwise alignment of the provided (query) sequences against a given reference (root) sequence using a banded local alignment algorithm with affine gap-cost. The band width and rough relative positions of query and reference sequence are determined through seed matching. Seed matching consists of finding several small fragments, *seeds*, where the reference and query sequence match exactly. Nextclade finds these matches using an [FM-index](https://en.wikipedia.org/wiki/FM-index). To improve sensitivity, Nextclade searches for exact matches while ignoring every third base, that is a matching pattern like `XX.XX.XX.XX` where `X` is matched and `.` ignored. This pattern allows to ignore the majority of synonymous mutations that happen at the third position in codons. The number of seeds, as well as their length, spacing are configurable in [Nextclade CLI](../nextclade-cli/index.rst).
Seed matches are then extended while allowing for a small number of mismatches in a sliding window (configurable) and pruned to an optimal chain of seeds in ascending order on query and reference sequences.

If the resulting chain of seeds covers a sufficient fraction of the query sequence (configurable), the relative positions of these seeds are used to estimate the shift of the query sequence relative to the reference and the amount of insertion/deletions between successive seeds.
These estimates are used to construct a band of variable width that covers the full alignment with high probability. The width of this band is configurable via parameters that determine the width around insertions or deletions between seeds (`--excess-bandwidth`) and at the end of the sequence (`--terminal-bandwidth`). The width of the band along the extended seed matches is controlled by the number of mismatches allowed during seed extension.
The alignment algorithm is a variation of the classic [Smith–Waterman](https://en.wikipedia.org/wiki/Smith%E2%80%93Waterman_algorithm) algorithm restricted to the band.
If the optimal alignment path hits the boundary of the allowed band, the parameters controlling the band are relaxed and alignment is redone.
To prevent Nextclade from running out of memory during the alignment process, the total area of the band is limited to a configurable maximum (`--max-band-area`) and a query sequence that requires a larger band will be skipped.

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

If a genome annotation is provided, Nextclade will use a lower gap-open-penalty at the beginning of a codon (delimited by the `|` characters in the schema above), thereby locking a gap in-frame if possible. Similarly, Nextclade preferentially places gaps outside of genes in case of ambiguities.

Alignment may fail if the query sequence is too divergent from the reference sequence, i.e. if there are many differences between the query and reference sequence. The seed matching step may then not be able to find a sufficient number of similar regions. This may happen due to usage of an incorrect reference sequence (e.g. from a different virus or a virus from a different host organism), if analysed sequences are of very low quality (e.g. containing a lot of missing regions or with a lot of ambiguous nucleotides) or are very short compared to the reference sequence.

> ⚠️ Analysis steps that follow the step alignment will ignore sequence regions before and after the alignment range, as well as unsequenced regions (consecutive gap (`-`) character ranges on the 5' and 3' ends). The exact alignment range is indicated as "Alignment range" in the analysis results table of [Nextclade Web](../nextclade-web/index.rst) and `alignmentStart` and `alignmentEnd` in the output files of [Nextclade Web](../nextclade-web/index.rst) and [Nextclade CLI](../nextclade-cli/index.rst).

### Results

The alignment step results in aligned nucleotide sequences, which are being produced in the form of a fasta files.

This file is written by [Nextclade CLI](../nextclade-cli/index.rst) and can be downloaded in the "Download" dialog of [Nextclade Web](../nextclade-web/index.rst).
