# Nextclade

## Inputs

Nextclade expects the following input data:

- (required) Sequences to be analyzed.

  Accepted formats: [FASTA](https://en.wikipedia.org/wiki/FASTA_format), plain text (one sequence per line).

- (required) Reference (root) sequence (required to be the root of the phylogenetic tree. See below).

  It is used as a reference for alignment and for mutation calling. Reference sequence is expected to be of a very high quality, preferably a complete (fill length of the genome, no missing data) and unambiguous (no ambiguous nucleotides).

  Accepted formats: [FASTA](https://en.wikipedia.org/wiki/FASTA_format), plain text (one sequence per line).

- (required) Reference phylogenetic tree, rooted at the reference (root) sequence.

  It is used to assign clades and as a target for phylogenetic placement. The tree is expected to be sufficiently diverse and conformant to the clade assignment expectations of a particular study or experiment. Only clades present on the reference tree will be assigned. For more details see "Clade assignment" and "Phylogenetic placement" sections below).

  Accepted formats: Auspice JSON v2 ([description](https://nextstrain.org/docs/bioinformatics/data-formats), [schema](https://github.com/nextstrain/augur/blob/master/augur/data/schema-export-v2.json)) - this is the same format that is used in Nextstrain (produced by Augur and consumed by Auspice).

- (required) Quality control configuration - a set of parameters and thresholds used to configure the QC checks. These should be tuned for the particular study or experiment, considering quality and tolerances of sequencing results of a given laboratory.

  Accepted formats: JSON

- (optional, recommended) Gene map (genome annotations) - a table describing the genes of the virus (frame, position, etc.). It is used for the improved codon-aware alignment, for gene translation, calling of aminoacid mutations. Without Gene map, peptides will not be output and aminoacid mutations will not be detected. Also, without Gene map the nucleotide alignment step will not be informed by the codon information.

  Accepted formats: [GFF3](https://github.com/The-Sequence-Ontology/Specifications/blob/master/gff3.md)

- (optional) Table of PCR primers - a table that describes a set of PCR primers that might be used for PCR tests of the virus. It is used to detect changes in PCR primer regions. Without this table these checks will not be performed.

  Accepted formats: CSV

  Note: the promers are processed differently depending on the primer type. The type is deduced from the primer's name suffix. Conventions that are used:

  - `_F` - forward primer
  - `_R` - reverse primer
  - `_P` - probe

## High-level overview of the pipeline

1. Sequence alignment

   In order for sequences to be analyzed, they need to be arranged in a way that allows for comparing similar regions. This process is called [sequence alignment](https://en.wikipedia.org/wiki/Sequence_alignment).

   Nextclade performs pairwise alignment of the provided (query) sequences against a given reference (root) sequence using banded local alignment algorithm with affine gap-cost. Width of the band and rough relative positions are determined through seed matching. This algorithm can be considered a variation of [Smith–Waterman](https://en.wikipedia.org/wiki/Smith%E2%80%93Waterman_algorithm) algorithm.

   Seed matching consists of finding several small fragments, "seeds", sufficiently similar in reference and query sequence. The number of seeds, length, spacing and number of allowed mismatched nucleotides is configurable.

   Alignment is only attempted only on sequences longer than 100 nucleotides (configurable), because alignment of shorter sequences might be unreliable.

   Alignment may fail for a variety of reasons. If the query sequence is too divergent from reference sequence (that is, if there are many changes in the sequence compared to reference), seed matching step might not be able to find required number of sufficiently similar regions. This may happen due to usage of incorrect reference sequence (e.g. from another virus or a virus from another host organism), if analysed sequences are of very low quality (containing a lot of missing regions or with a lot of ambiguous nucleotides) or are very short compared to the reference sequence.

   Note: the subsequent analysis steps will ignore regions before and after alignment, as well as unsequenced regions (consecutive `-` character ranges on the 5' and 3' ends). The exact alignment range is being output in analysis results as `alignmentStart` and `alignmentEnd`.

2. Translation

   In order to detect changes in protein structure of the virus, aminoacid sequences (peptides) need to be computed from the nucleotide sequence regions correspongding to [genes](https://en.wikipedia.org/wiki/Gene). This process is called [translation](<https://en.wikipedia.org/wiki/Translation_(biology)>). Peptides then need to be aligned, in order to make them comparable, similarly to how it's done with nucleotide sequences.

   Nextclade performs translation separately for every gene (the list of genes to be considered for translation is configurable). Nextclade finds genes by looking into the Gene map, and then generates peptides by taking every triplet of nucleotides (codon) and translating it into a corresponding aminoacid. It then aligns the resulting peptides against the corresponding reference peptides (translated from reference sequence), using the same alignment algorithm as for nucleotide sequences.

   This step only runs if Gene map is provided.

3. Nucleotide mutation calling and statistics

   Aligned nucleotide sequence, are compared against reference sequence.

   Mismatches are noted and later reported as mutations: in case the nucleotide has changed to `-`
   (a "gap", meaning that the nucleotide was present in reference sequence, but is not present in the query sequence), a nucleotide deletion is reported, otherwise a nucleotide substitution (for example a change from `A` to `G`).

   Nextclade also gathers and reports other usful statistics, such as all contiguous ranges of `N` (missing) and non-ACGTN (ambiguous) nucleotides, as well as total numbers of substitutions, deletions, missing and ambiguous nucleotides.

4. Aminoacid mutation calling and statistics

   Similarly, aminoacid mutations and statistics are gathered from the aligned peptides obtained after translation.

   This step only runs if Gene map is provided.

5. PCR primer changes detection

   [Polymerase chain reaction (PCR)](https://en.wikipedia.org/wiki/Polymerase_chain_reaction) uses small nucleotide sequence snippets, [complemetary](<https://en.wikipedia.org/wiki/Complementarity_(molecular_biology)>) to a specific region of the virus genome. Complementarity is essential for PCR to work, and changes in the virus genome can interfere with the process. If provided with a list of PCR primers, Nextclade can detect and report changes in these regions.

   First, for each primer, Nextclade finds and records the complemetary ranges in reference sequence.
   Later, it verifies if any of the mutations in query sequence (found during "Nucleotide mutation calling" step) fall to any of these ranges, and if so, reports these mutations as PCR primer changes.

   This step only runs if PCR primers table is provided. It can fail if PCR primers provided don't correspond to the reference sequence used.

   Note: A standalone command-line tool Nextalign is available, that performs only the alignment (1) and translation (2) steps, without any of the analysis steps.

6. Phylogenetic placement

7. Clade assignment

   Nextclade takes the clade of the nearest tree node (found in the "Phylogenetic placement" step), assigns it to the query sequence node and reports it.

   Note: Only clades present in the reference tree can be assigned. It is important to make sure every clade taht is expected as a result of the assignment is well represented in the reference tree.

## Nextclade: implementation details

Note: Implementation details may change periodically. In this case, this section might go out of date and might need to be updated.

On implementation level, Nextclade analysis algorithm consists of the following steps (in order):

- read, validate and parse input files

- preprocess tree (prepare nodes for the following steps: mark reference nodes, prepare mutation map)

- for each input sequence (concurrently, streaming sequence data):

  - align sequence against reference sequence

  - strip insertions from sequence, but keep a record of each insertion

  - for each gene:

    - translate gene

    -

  - write aligned sequences

  - write previously gathered insertions

  - for each gene:

    - write peptide sequences

- postprocess tree (revert changes made in preprocessing step, add metadata)
