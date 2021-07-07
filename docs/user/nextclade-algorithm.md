## High-level overview of the pipeline

Nextclade's workflow is pipeline, which consists of a several steps. This section describes these steps, rougly in their order of execution.

Note: A standalone command-line tool "Nextalign" is available, that performs only the alignment (1) and translation (2) steps, without any of the subsequent analysis steps.

### 1. Sequence alignment

In order for sequences to be analyzed, they need to be arranged in a way that allows for comparing homologous regions. This process is called [sequence alignment](https://en.wikipedia.org/wiki/Sequence_alignment).

Nextclade performs pairwise alignment of the provided (query) sequences against a given reference sequence using banded local alignment algorithm with affine gap-cost. Width of the band and rough relative positions are determined through seed matching. This algorithm can be considered a variation of [Smith–Waterman](https://en.wikipedia.org/wiki/Smith%E2%80%93Waterman_algorithm) algorithm. Seed matching consists of finding several small fragments, "seeds", sufficiently similar in reference and query sequence. The number of seeds, as well as their length, spacing and number of allowed mismatched nucleotides in them are configurable. Nextclade strips insertions relative to the reference from the aligned sequences and writes them to a separate file.

This strategy aims to be sufficiently fast for running in the internet browser on an average consumer computer hardware and trades accuracy of the alignment for runtime performance. We found that it works well for most sequences.

Alignment is only attempted on sequences longer than 100 nucleotides (configurable), because alignment of shorter sequences might be unreliable.

Nextclade can use a genome annotation to make the alignment more interpretable.
Sometimes, the placement of a sequence deletion or insertion is ambiguous as in the following example.
The gap could be moved forward or backward by one base with the same number of matches:
```
...GTT.TAT.TAC...
...GTT.---.TAC...
```
If a genome annotation is provided, Nextclade will use a lower gap-open-penalties at the beginning of a codon (marked by a `.`), there by locking a gap in-frame if possible.
Similarly, nextalign preferentially places gaps outside of genes in case of ambiguities.

Alignment may fail for a variety of reasons. If the query sequence is too divergent from reference sequence (that is, if there are many changes in the sequence compared to reference), seed matching step might not be able to find required number of sufficiently similar regions. This may happen due to usage of incorrect reference sequence (e.g. from another virus or a virus from another host organism), if analysed sequences are of very low quality (containing a lot of missing regions or with a lot of ambiguous nucleotides) or are very short compared to the reference sequence.

Note: the subsequent analysis steps will ignore regions before and after alignment, as well as unsequenced regions (consecutive `-` character ranges on the 5' and 3' ends). The exact alignment range is indicated in the [analysis results]() as `alignmentStart` and `alignmentEnd`.

### 2. Translation

In order to detect changes in protein structure of the virus, aminoacid sequences (peptides) need to be computed from the nucleotide sequence regions corresponding to [genes](https://en.wikipedia.org/wiki/Gene). This process is called [translation](<https://en.wikipedia.org/wiki/Translation_(biology)>). Peptides then need to be aligned, in order to make them comparable, similarly to how it's done with nucleotide sequences.

Nextclade performs translation separately for every gene (the list of genes to be considered for translation is configurable).
Genes are specified via a genome annotation in GFF3 format (gene map).
For each coding sequence annotated in the reference, Nextclade extracts the corresponding query sequence from the nucleotide alignment, and then generates peptides by taking every triplet of nucleotides (codon) and translating it into a corresponding aminoacid. It then aligns the resulting peptides against the corresponding reference peptides (translated from reference sequence), using the same alignment algorithm as for nucleotide sequences.

This step only runs if a `gene-map` is provided.

### 3. Nucleotide mutation calling and statistics

Aligned nucleotide sequence are compared against reference sequence.
Mismatches are noted and later reported as mutations: in case the nucleotide has changed to `-`
(a "gap", meaning that the nucleotide was present in reference sequence, but is not present in the query sequence), a nucleotide deletion is reported, otherwise a nucleotide substitution (for example a change from `A` to `G`).
Insertions in the query sequence are stripped from the alignment and kept in a separate data structure linking the position in the reference after which the insertion occured to the sequence that was inserted like `{22030: 'ACT'}`.
These insertions are optionally written to a tabular file.

Nextclade also gathers and reports other useful statistics, such as all contiguous ranges of `N` (missing) and non-ACGTN (ambiguous) nucleotides, as well as total numbers of substitutions, deletions, missing and ambiguous nucleotides.

### 4. Aminoacid mutation calling and statistics

Similarly, aminoacid mutations and statistics are gathered from the aligned peptides obtained after translation.

This step only runs if gene map is provided.

### 5. PCR primer changes detection

[Polymerase chain reaction (PCR)](https://en.wikipedia.org/wiki/Polymerase_chain_reaction) uses small nucleotide sequence snippets, [complementary](<https://en.wikipedia.org/wiki/Complementarity_(molecular_biology)>) to a specific region of the virus genome. Complementarity is essential for PCR to work, and changes in the virus genome can interfere with the process. If provided with a table of PCR primers (in CSV format), Nextclade can analyze these regions in sequences and detect and report changes.

For each primer, Nextclade finds and records a corresponding range in the reference sequence.
Later, it verifies if any of the mutations in aligned query sequence (found during "Nucleotide mutation calling" step) fall to any of these ranges, and if so, reports these mutations as PCR primer changes.

This step only runs if PCR primers table is provided. It can fail if PCR primers provided don't correspond to the reference sequence used.

### 6. Phylogenetic placement

After reference alignment and mutation calling, Nextclade places each sequence on a phylogenetic tree.
The root of this phylogenetic tree HAS to be the same as the reference (root) sequence.
The phylogenetic placement is achieved by comparing the mutations of the query sequence relative to the reference to the mutations of every node in the tree and finding the closest match.
Mutation that separate the query sequence and the closest match are designated "private mutations" and are used as an additional QC metric.
Sequencing errors and sequence assembly problems are expected to give rise to such rare 'private' and an excess of such mutations is therefor a useful QC metric.
In addition to the overall number of such private mutations, Nextclade also assesses whether they cluster in specific regions of the genome, as such clusters are again indicative of quality issues.

### 7. Clade assignment

To facilitate discussion of the co-circulating variants of viruses, Nextstrain projects group them into **clades**, which are defined by specific combination of signature mutations. Clades are groups of related sequences that share a common ancestor. We try to align these clades as much as possible with [WHO variant designations](https://www.who.int/en/activities/tracking-SARS-CoV-2-variants/).

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

Many such problems can be fixed by tweaking the pipeline or by removing contaminants. It is therefore useful to spot these problems early. Nextclade will scan your sequences for issues that indicate problems during sequencing or bioinformatic assembly. We currently implemented several metrics to flag a sequence as potentially problematic.
The individual metrics are calibrated such that 0 is best, 100 corresponds to a bad sequence, and 30 starts to warrant a warning.
Different metrics are aggregated as
$$
\text{qc.overallScore} = \sum_i \frac{score_i^2}{100}
$$
With this quadratic aggregation, multiple mildly concerning scores don't result in a bad overall score, but a single bad score guarantees a bad overall score.


For SARS-CoV-2, we currently implement the following metrics:

- Missing data: If your sequence misses more than 3000 sites (`N`s), it will be flagged as `bad`

- Private mutations: Sequences with more than 24 mutations relative to the closest sequence in the reference tree are flagged as `bad`.
  We will revise this threshold as diversity of the SARS-CoV-2 population increases.

- Ambiguous nucleotides: mixed states (such as `R`, `Y`, etc) are indicative of contamination (or
  superinfection) and more than 10 such non-ACGTN characters will result in a QC flag `bad`.

- Clustered differences: If your sequence has clusters with 6 or more private differences in 100 bases, it will be flagged as `bad`.

- Stop codons: replicating viruses can not have premature stop codons in essential genes and such premature stops are hence an indicator of problematic sequences.
  However, some stop codons are known to be common even in functional viruses.
  Our stop codon QC excludes such known stop codons and assigns a QC score of 75 to each additional premature stop.

- Frame shift mutations: frame shifting insertions or deletions typically result in a garbled translation or a premature stop.
  Nextalign currently doesn't translate frame shifted coding sequences and each frame shift is assigned a QC score 75.
  Note, however, that clade 21H has a frame shift towards the end of ORF3a that results in a premature stop.

These warnings don't necessarily mean your sequences are problematic, but these issues warrant closer examination. The [Nextstrain SARS-CoV-2 pipeline](https://github.com/nextstrain/ncov) uses similar (more lenient) QC criteria. For example, nextstrain will exclude your sequence if it has fewer than 27000 valid bases (corresponding to roughly 3000 Ns) and doesn't check for ambiguous characters. But sequences flagged for excess divergence and SNP clusters by Nextclade are likely excluded by Nextstrain.

<!-- TODO: check factual correctness and spelling of the next sentence -->

Note that there are many additional potential problems Nextclade does not check for. These include for example: primer sequences, adaptaters, or chimeras between divergent SARS-CoV-2 strains.
