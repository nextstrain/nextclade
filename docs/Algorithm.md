# Nextclade

## What is Nextclade?

Nextclade is a tool that identifies differences between your sequences and a reference sequence used by Nextstrain, uses these differences to assign your sequences to clades, and reports potential sequence quality issues in your data. You can use the tool to analyze sequences before you upload them to a database, or if you want to assign Nextstrain clades to a set of sequences.

## How to obtain Nextclade?

Nextclade is available as a web application and as a command-line tool. The source code of the algorithm is shared between both versions, they consume the same inputs and produce the same outputs.

### Web application

Nextclade Web is available online at [clades.nextstrain.org](https://clades.nextstrain.org). This is the easiest way of using it and is a recommended way to get started.

Drag a fasta file onto the "upload" box, provide a url or paste sequence data directly into the text box. The sequences will then be analyzed right in your browser - data never leaves your computer (i.e. no actual "upload" is happening). Since your computer is doing the computational work rather than a remote server, it is advisable to analyze at most a few hundred of sequences at a time, depending on yor hardware.

Power users might want to switch to "Advanced mode" in order to get access to more configuration. This mode is equivalent to using Nextclade command-line tool and accepts the same input files (see "Inputs" section).

Simple mode of the web application currently only supports SARS-CoV-2, but we will hopefully extend the tool to other pathogens in the future.

### Command-line interface (CLI)

Nextclade CLI is available as a self-contained executable for the most popular platforms.

The latest downloads are available at https://github.com/nextstrain/nextclade/releases

Docker container images are available at https://hub.docker.com/r/nextstrain/nextclade

After obtaining the Nextclade CLI, type `nextclade --help` to display built-in help with the description of command-line flags and usage example.

### Source code

Nextclade is free and opensource. The source code for the algorithms, web application and CLI is available on [Github](https://github.com/nextstrain/nextclade). You can build Nextclade yourself and run web application locally. For details, refer to the readme file in the repository.

## How to contribute to Nextclade?

We welcome contributions in any form.

Please report bugs and request features using GitHub Issues:
https://github.com/nextstrain/nextclade/issues/new

For questions and general discussion join Nextstrain discussion forum:
https://discussion.nextstrain.org

If you are a developer, head to https://github.com/nextstrain/nextclade for the source code and developer's guide.

## Inputs

### Description of the input data

Nextclade expects the following input data:

- (required) Sequences to be analyzed.
  
  CLI flag: `--input-fasta`

  Accepted formats: [FASTA](https://en.wikipedia.org/wiki/FASTA_format), plain text (one sequence per line).

- (required) Reference (root) sequence. Required to be the root of the provided reference phylogenetic tree (see below).

  CLI flag: `--input-root-sequence`

  It is used as a reference for alignment and for mutation calling. Reference sequence is expected to be of a very high quality, preferably a complete (fill length of the genome, no missing data) and unambiguous (no ambiguous nucleotides).

  Accepted formats: [FASTA](https://en.wikipedia.org/wiki/FASTA_format), plain text (one sequence per line).

- (required) Reference phylogenetic tree, rooted at the reference (root) sequence.

  CLI flag: `--input-root-sequence`

  It is used to assign clades and as a target for phylogenetic placement. The tree is expected to be sufficiently diverse and to meet clade assignment expectations of a particular use-case, study or experiment. Only clades present on the reference tree will be assigned. For more details see "Clade assignment" and "Phylogenetic placement" sections below).

  Accepted formats: Auspice JSON v2 ([description](https://nextstrain.org/docs/bioinformatics/data-formats), [schema](https://github.com/nextstrain/augur/blob/master/augur/data/schema-export-v2.json)) - this is the same format that is used in Nextstrain (produced by Augur and consumed by Auspice).

- (required) Quality control configuration.

  CLI flag: `--input-qc-config`

  A set of parameters and thresholds used to configure the QC checks. These should be tuned for the particular study or experiment, considering quality and tolerances of sequencing results of a given laboratory.

  Accepted formats: JSON

- (optional, recommended) Gene map (genome annotations) - a table describing the genes of the virus (frame, position, etc.). 

  CLI flag: `--input-gene-map`

  It is used for the improved codon-aware alignment, for gene translation, calling of aminoacid mutations. Without Gene map, peptides will not be output and aminoacid mutations will not be detected. Also, without Gene map the nucleotide alignment step will not be informed by the codon information.

  Accepted formats: [GFF3](https://github.com/The-Sequence-Ontology/Specifications/blob/master/gff3.md)

- (optional) Table of PCR primers - a table that describes a set of PCR primers that might be used for PCR tests of the virus.

  CLI flag: `--input-pcr-primers`

  Used to detect changes in PCR primer regions. Without this table these checks will not be  performed.

  Accepted formats: CSV

  Note: the primers are processed differently depending on the primer type. The type is deduced from the primer's name suffix. Conventions that are used:

  - `_F` - forward primer
  - `_R` - reverse primer
  - `_P` - probe

### Example data

Nextclade GitHub repository contains example data in the `data/` directory. Maintainers periodically update these files (including the reference trees), and these is the recommended starting point for your experiments.

https://github.com/nextstrain/nextclade/tree/master/data

## High-level overview of the pipeline

### 1. Sequence alignment

In order for sequences to be analyzed, they need to be arranged in a way that allows for comparing similar regions. This process is called [sequence alignment](https://en.wikipedia.org/wiki/Sequence_alignment).

Nextclade performs pairwise alignment of the provided (query) sequences against a given reference (root) sequence using banded local alignment algorithm with affine gap-cost. Width of the band and rough relative positions are determined through seed matching. This algorithm can be considered a variation of [Smith–Waterman](https://en.wikipedia.org/wiki/Smith%E2%80%93Waterman_algorithm) algorithm. Seed matching consists of finding several small fragments, "seeds", sufficiently similar in reference and query sequence. The number of seeds, as well as their length, spacing and number of allowed mismatched nucleotides in them are configurable. Nextclade strips insertions relative to the reference from the aligned sequences.

<!-- TODO: explain codon-aware alignment -->

This strategy aims to be sufficiently fast for running in the internet browser on an average consumer computer hardware and trades accuracy of the alignment for runtime performance. We found that it works well for most sequences.

Alignment is only attempted on sequences longer than 100 nucleotides (configurable), because alignment of shorter sequences might be unreliable.

Alignment may fail for a variety of reasons. If the query sequence is too divergent from reference sequence (that is, if there are many changes in the sequence compared to reference), seed matching step might not be able to find required number of sufficiently similar regions. This may happen due to usage of incorrect reference sequence (e.g. from another virus or a virus from another host organism), if analysed sequences are of very low quality (containing a lot of missing regions or with a lot of ambiguous nucleotides) or are very short compared to the reference sequence.

Note: the subsequent analysis steps will ignore regions before and after alignment, as well as unsequenced regions (consecutive `-` character ranges on the 5' and 3' ends). The exact alignment range is indicated in the [analysis results]() as `alignmentStart` and `alignmentEnd`.

### 2. Translation

In order to detect changes in protein structure of the virus, aminoacid sequences (peptides) need to be computed from the nucleotide sequence regions corresponding to [genes](https://en.wikipedia.org/wiki/Gene). This process is called [translation](<https://en.wikipedia.org/wiki/Translation_(biology)>). Peptides then need to be aligned, in order to make them comparable, similarly to how it's done with nucleotide sequences.

Nextclade performs translation separately for every gene (the list of genes to be considered for translation is configurable). Nextclade finds genes by looking into the Gene map, and then generates peptides by taking every triplet of nucleotides (codon) and translating it into a corresponding aminoacid. It then aligns the resulting peptides against the corresponding reference peptides (translated from reference sequence), using the same alignment algorithm as for nucleotide sequences.

This step only runs if Gene map is provided.

### 3. Nucleotide mutation calling and statistics

Aligned nucleotide sequence, are compared against reference sequence.

Mismatches are noted and later reported as mutations: in case the nucleotide has changed to `-`
(a "gap", meaning that the nucleotide was present in reference sequence, but is not present in the query sequence), a nucleotide deletion is reported, otherwise a nucleotide substitution (for example a change from `A` to `G`).

Nextclade also gathers and reports other useful statistics, such as all contiguous ranges of `N` (missing) and non-ACGTN (ambiguous) nucleotides, as well as total numbers of substitutions, deletions, missing and ambiguous nucleotides.

### 4. Aminoacid mutation calling and statistics

Similarly, aminoacid mutations and statistics are gathered from the aligned peptides obtained after translation.

This step only runs if Gene map is provided.

### 5. PCR primer changes detection

[Polymerase chain reaction (PCR)](https://en.wikipedia.org/wiki/Polymerase_chain_reaction) uses small nucleotide sequence snippets, [complementary](<https://en.wikipedia.org/wiki/Complementarity_(molecular_biology)>) to a specific region of the virus genome. Complementarity is essential for PCR to work, and changes in the virus genome can interfere with the process. If provided with a list of PCR primers, Nextclade can detect and report changes in these regions.

First, for each primer, Nextclade finds and records the complementary ranges in reference sequence.
Later, it verifies if any of the mutations in query sequence (found during "Nucleotide mutation calling" step) fall to any of these ranges, and if so, reports these mutations as PCR primer changes.

This step only runs if PCR primers table is provided. It can fail if PCR primers provided don't correspond to the reference sequence used.

Note: A standalone command-line tool Nextalign is available, that performs only the alignment (1) and translation (2) steps, without any of the analysis steps.

### 6. Phylogenetic placement

Note: Phylogenetic placement is not

### 7. Clade assignment

To facilitate discussion of the co-circulating variants of viruses, Nextstrain projects group them into **clades**, which are defined by specific combination of signature mutations. Clades are groups of related sequences that share a common ancestor.

The analysis pipeline of [Nextstrain.org](https://nextstrain.org) uses phylogenetic context to build the tree and to assign clades. This currently requires setting up a pipeline and running a heavy computational job.

By contrast, Nextclade takes a lightweight approach, and assigns your sequences to clades by placing them on a phylogenetic tree annotated with clade definitions. More specifically, Nextclade looks at the clade of the nearest tree node found in the "Phylogenetic placement" step. This is an accuracy to runtime performance trade-off - Nextclade provides almost instantaneous result, but is expected to be slightly less sensitive than the full pipeline.

Note: Nextclade only considers clades present in the reference tree. It is important to make sure every clade that you expect to find in the results is well represented in the reference tree. If unsure, use one of the default trees or any other up-to-date and sufficiently diverse tree. For focal regional studies it is recommended to also include clades that are specific for your region.

#### Nextstrain clades for SARS-CoV-2

   <!-- TODO: Possibly update this section -->

At the moment of writing Nextstrain defines 11 major clades (see [this blog post](https://nextstrain.org/blog/2021-01-06-updated-SARS-CoV-2-clade-naming) for details):

- 19A and 19B emerged in Wuhan and have been dominating the early outbreak

- 20A emerged from 19A out of dominated the European outbreak in March and has since spread globally

- 20B and 20C are large genetically distinct subclades 20A emerged in early 2020

- 20D to 20I have emerged over the summer of 2020 and include two "variants of concern" (VOC) with signature mutations S:N501Y.

   <!-- TODO: add clade schema -->

You can find the exact clade definitions in [github.com/nextstrain/ncov](https://github.com/nextstrain/ncov/blob/master/defaults/clades.tsv).

### 8. Quality Control (QC)

Whole-genome sequencing of viruses is not a push-button operation -- in particular from scarce or degraded input material.
Some parts of the sequence might be missing and the bioinformatic analysis pipelines that turn the raw data into a consensus genome sometimes produce artefacts. Such artefacts typically manifest in spurious differences of the sequence from the reference. If such problematic sequences are included in phylogenetic analysis, they can distort the tree. The Nextstrain analysis pipeline therefore excludes sequences deemed problematic.

Many such problems can be fixed by tweaking the pipeline or by removing contaminants. It is therefore useful to spot these problems early. Nextclade will scan your sequences for issues that indicate problems during sequencing or bioinformatic assembly. We currently implemented several metrics to flag a sequence as potentially problematic:

<!-- TODO: rewrite this list in a virus-independent way, without numbers -->

- Missing data: If your sequence misses more than 1000 sites (`N`s), it will be flagged

- Divergence: Sequences with more than 20 mutations relative to the reference sequence are flagged.
  We will revise this threshold as diversity of the SARS-CoV-2 population increases.

- Ambiguous nucleotides: mixed states (such as `R`, `Y`, etc) are indicative of contamination (or
  superinfection) and more than 10 such non-ACGTN characters will result in a QC warning.

- Clustered differences: If your sequence has clusters with 6 or more differences in 100 bases (excluding known clusters
  like positions 28881-28883), it will be flagged.

These warnings don't necessarily mean your sequences are problematic, but these issues warrant closer examination. The [Nextstrain SARS-CoV-2 pipeline](https://github.com/nextstrain/ncov) uses similar (more lenient) QC criteria. For example, nextstrain will exclude your sequence if it has fewer than 27000 valid bases (corresponding to roughly 3000 Ns) and doesn't check for ambiguous characters. But sequences flagged for excess divergence and SNP clusters by Nextclade are likely excluded by Nextstrain.

<!-- TODO: check factual correctness and spelling of the next sentence -->

Note that there are many additional potential problems Nextclade does not check for. These include for example: primer sequences, adaptaters, or chimeras between divergent SARS-CoV-2 strains.

## Implementation details

Note: Implementation details may change periodically. In this case, this section might go out of date and might need to be updated.

On implementation level, Nextclade analysis algorithm consists of the following steps (in order of execution):

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

## Results and interpretation

### Output files

This section describes files produced by Nextclade.

You can download these files from Nextclade Web using "Export" button (note that there is no real download, all files are generated right in your browser).

Nextclade CLI writes these files into paths specified with a family of `--output*` flags.

#### Aligned nucleotide sequences

Aligned sequences are produced as a result of the nucleotide alignment step and are being output in FASTA format. The file contains the aligned reference sequence as the first entry (requires `--include-reference` flag in CLI version), followed by the aligned query sequences.

#### Aligned peptides

Aligned peptides are produced as a result of the translation and peptide alignment step and are being output in FASTA format. There are multiple files, one for each gene. Each file contains the aligned reference peptide as the first entry (requires `--include-reference` flag in CLI version), followed by the aligned query sequences.

#### Analysis results

The results of mutation calling, clade assignment, quality control and PCR primer changes can be obtained in either TSV, CSV, or JSON format.

TSV and CSV files are equivalent and only differ in the column delimiter (tabs vs semicolons), for better compatibility with spreadsheet software and data-science packages. Tabular format of TSV/CSV files are somewhat more human-friendly, are convenient for the immediate inspection and for simple automated processing.

They contain the following columns:

TODO: describe columns

JSON results file is best for in-depth automated processing of results. It contains everything tabular files contain, plus more, in a more machine-friendly format.

TODO: add JSON schema

#### Stripped insertions

Nextclade strips insertions relative to the reference from aligned query sequences, so that they no longer appear in the output sequences. It outputs information about these insertions in CSV format.

The file contains the following columns (delimited by commas):

- `seqName` - Name of the sequence, as in the input FASTA file

- `insertions` - A string containing semicolon-separated insertions. Each insertion is in format `<begin>:<seq>`, where `<begin>` is the starting position of the insertion in the aligned sequence, `<seq>` is the nucleotide sequence fragment that was removed.

#### Output phylogenetic tree

TODO: write this section
