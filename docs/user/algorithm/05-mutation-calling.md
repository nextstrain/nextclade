# 5. Mutation calling

In order to detect nucleotide mutations, aligned nucleotide sequences are compared with the reference nucleotide sequence, one nucleotide at a time. Mismatches between the query and reference sequences are then noted and reported differently, depending on their nature:

- Nucleotide substitutions: a change from one character to another. For example a change from `A` in the reference sequence to `G` in the query sequence. They are shown in sequence views in [Nextclade Web](../nextclade-web) as colored markers, where color signifies the resulting character (in query sequence).

- Nucleotide deletions ("gaps"): nucleotide was present in the reference sequence, but is not present in the query sequence. These are indicated by the "`-`" character in the alignment sequence. They are shown in sequence views in [Nextclade Web](../nextclade-web) as dark-grey markers. In the output files deletions are represented as numeric ranges, signifying the start and end of the deleted fragment (for example: `21765-21770`)

- Nucleotide insertions: additional nucleotides in the query sequence that were not present in the reference sequence. They are stripped from the alignment and reported separately, showing the position in the reference after which the insertion occurred and the fragment that was inserted. `22030:ACT` would indicate that the query sequence has the three bases `ACT` inserted between position `22030` and `22031` in the reference sequence (the indices are 1-based).

Nextclade also gathers and reports other useful statistics, such as the number of contiguous ranges of `N` (missing) and non-ACGTN (ambiguous) nucleotides, as well as the total counts of substituted, deleted, missing and ambiguous nucleotides. You can find this information in the results table of [Nextclade Web](../nextclade-web) and in the output files of [Nextclade CLI](../nextclade-cli).

Similarly, aminoacid mutations and statistics are gathered from the aligned peptides obtained after [translation](./02-translation). This step only runs if a [genome annotation](../input-files/03-genome-annotation) is provided.

### Private mutations

Following the [tree placement](03-phylogenetic-placement.md), Nextclade identifies "private mutations" - the mutations between the query sequence and the sequence corresponding to the nearest neighbor (parent) on the tree.

In the figure, the query sequence (dashed) is compared to all sequences (including internal nodes) of the reference tree to identify the nearest neighbor. The yellow and dark green mutations are private mutations, as they occur in addition to the 3 mutations of the attachment node.

![Identification of private mutations](../assets/algo_private-muts.png)

Many sequence quality problems are identifiable by the presence of private mutations. Sequences with unusually many private mutations are unlikely to be biological and are thus [flagged as bad](06-quality-control.md#private-mutations-p).

Nextclade classifies private mutations further into 3 categories to be more sensitive to potential contamination, co-infection and recombination:

1. Reversions: Private mutations that go back to the reference sequence, i.e. a mutation with respect to reference is present on the attachment node but not on the query sequence.
2. Labeled mutations: Private mutations to a genotype that is known to be common in a clade.
3. Unlabeled mutations: Private mutations that are neither reversions nor labeled.

For an illustration of these 3 types, see the figure below.

![Classification of private mutations](../assets/algo_private-muts-classification.png)

Reversions are common artefacts in some bioinformatic pipelines when there is amplicon dropout.
They are also a sign of contamination, co-infection or recombination. Labeled mutations also contain commonly when there's contamination, co-infection or recombination.

Reversions and labeled mutations are weighted several times higher than unlabeled mutations due to their higher sensitivity and specificity for quality problems (and recombination).
In February 2022, every reversion was counted 6 times (`weightReversionSubstitutions`) while every labeled mutation was counted 4 times (`weightLabeledSubstitutions`). Unlabeled mutations get weight 1 (`weightUnlabeledSubstitutions`).

From the weighted sum, 8 (`typical`) is subtracted. The score is then a linear interpolation between 0 and 100 (and above), where 100 corresponds to 24 (`cutoff`).

Private deletion ranges (including reversion) are currently counted as a single unlabeled substitution, but this could change in the future.

### Results

The nucleotide mutations can be viewed in "Sequence view" column of the results table in [Nextclade Web](../nextclade-web). Switching "Sequence view" to a particular gene will show mutations in the corresponding peptide.

The mutation calling step results in a set of mutations and various practical metrics for each sequence. They are produced as a part of the analysis results [JSON](../output-files/05-results-json), [CSV and TSV files](../output-files/04-results-tsv) in [Nextclade CLI](../nextclade-cli) and in the "Download" dialog of [Nextclade Web](../nextclade-web).
