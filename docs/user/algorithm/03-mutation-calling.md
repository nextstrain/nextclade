# 3. Mutation calling

In order to detect nucleotide mutations, aligned nucleotide sequences are compared with the reference nucleotide sequence, one nucleotide at a time. Mismatches between the query and reference sequences are then noted and reported differently, depending on their nature:

- Nucleotide substitutions: a change from one character to another. For example a change from `A` in the reference sequence to `G` in the query sequence. They are shown in sequence views in [Nextclade Web](../nextclade-web) as colored markers, where color signifies the resulting character (in query sequence).

- Nucleotide deletions ("gaps"): nucleotide was present in the reference sequence, but is not present in the query sequence. These are indicated by the "`-`" character in the alignment sequence. They are shown in sequence views in [Nextclade Web](../nextclade-web) as dark-grey markers. In the output files deletions are represented as numeric ranges, signifying the start and end of the deleted fragment (for example: `21765-21770`)

- Nucleotide insertions: additional nucleotides in the query sequence that were not present in the reference sequence. They are stripped from the alignment and reported separately, showing the position in the reference after which the insertion occurred and the fragment that was inserted. `22030:ACT` would indicate that the query sequence has the three bases `ACT` inserted between position `22030` and `22031` in the reference sequence (the indices are 1-based).

Nextclade also gathers and reports other useful statistics, such as the number of contiguous ranges of `N` (missing) and non-ACGTN (ambiguous) nucleotides, as well as the total counts of substituted, deleted, missing and ambiguous nucleotides. You can find this information in the results table of [Nextclade Web](../nextclade-web) and in the output files of [Nextclade CLI](../nextclade-cli).

Similarly, aminoacid mutations and statistics are gathered from the aligned peptides obtained after [translation](./02-translation). This step only runs if a [genome annotation](../input-files/03-genome-annotation) is provided.

### Results

The nucleotide mutations can be viewed in "Sequence view" column of the results table in [Nextclade Web](../nextclade-web). Switching "Sequence view" to a particular gene will show mutations in the corresponding peptide.

The mutation calling step results in a set of mutations and various practical metrics for each sequence. They are produced as a part of the analysis results [JSON](../output-files/05-results-json), [CSV and TSV files](../output-files/04-results-tsv) in [Nextclade CLI](../nextclade-cli) and in the "Download" dialog of [Nextclade Web](../nextclade-web).
