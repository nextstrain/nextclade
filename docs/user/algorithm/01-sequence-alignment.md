# 1. Sequence alignment

In order for sequences to be analyzed, they need to be arranged in a way that allows for comparing homologous regions. This process is called [sequence alignment](https://en.wikipedia.org/wiki/Sequence_alignment).

Nextclade performs pairwise alignment of the provided (query) sequences against a given reference (root) sequence using a banded local alignment algorithm with affine gap-cost. The band width and rough relative positions <!--- Positions of what? --> are determined through seed matching. Seed matching consists of finding several small fragments, *seeds*, of sufficient similarity in the reference and query sequences. The number of seeds, as well as their length, spacing and the allowed number of mismatched nucleotides in them are configurable in [Nextclade CLI](nextclade-cli). This algorithm can be considered a variation of the [Smith–Waterman](https://en.wikipedia.org/wiki/Smith%E2%80%93Waterman_algorithm) algorithm.

Nextclade strips insertions relative to the reference from the aligned sequences and lists them in a separate file.

The algorithm aims to be sufficiently fast for running in the internet browser of an average consumer computer, by trading reduced alignment accuracy for improved runtime performance. We found that it works well for most sequences.

By default, alignment is only attempted on sequences longer than 100 nucleotides (configurable), because alignment of shorter sequences may be unreliable.

Nextclade can use a genome annotation to make the alignment more interpretable. Sometimes, the placement of a sequence deletion or insertion is ambiguous as in the following example. The gap could be moved forward or backward by one base with the same number of matches:

```
Reference  : ... | GTT | TAT | TAC | ... 
Alignment 1: ... | GTT | --- | TAC | ... 
Alignment 2: ... | GT- | --T | TAC | ... 
Alignment 3: ... | GTT | T-- | -AC | ... 
```

<!-- 

```
reference  : ...GTT.TAT.TAC... 
alignment 1: ...GTT.---.TAC... 
alignment 2: ...GT-.--T.TAC... 
alignment 3: ...GTT.T--.-AC... 
```

-->

If a genome annotation is provided, Nextclade will use a lower gap-open-penalty at the beginning of a codon (delimited by the `|` characters in the schema above), thereby locking a gap in-frame if possible. Similarly, nextalign preferentially places gaps outside of genes in case of ambiguities.

Alignment may fail if the query sequence is too divergent from the reference sequence, i.e. if there are many differences between the query and reference sequence. The seed matching step may then not be able to find a sufficient number of similar regions. This may happen due to usage of an incorrect reference sequence (e.g. from a different virus or a virus from a different host organism), if analysed sequences are of very low quality (e.g. containing a lot of missing regions or with a lot of ambiguous nucleotides) or are very short compared to the reference sequence.

> ⚠️ Analysis steps that follow the step alignment will ignore sequence regions before and after the alignment range, as well as unsequenced regions (consecutive gap (`-`) character ranges on the 5' and 3' ends). The exact alignment range is indicated as "Alignment range" in the analysis results table of [Nextclade Web](../nextclade-web) and `alignmentStart` and `alignmentEnd` in the output files of [Nextclade Web](../nextclade-web) and [Nextclade CLI](../nextclade-cli).

### Results

The alignment step results in aligned nucleotide sequences, which are being produced in the form of a fasta files.

This file is written by [Nextclade CLI](../nextclade-cli) and can be downloaded in the "Download" dialog of [Nextclade Web](../nextclade-web).
