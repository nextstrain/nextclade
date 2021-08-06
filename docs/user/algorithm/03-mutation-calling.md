# 3. Nucleotide mutation calling

In order to detect nucleotide mutations, aligned nucleotide sequences are compared with the reference nucleotide sequence, one nucleotide at a time. Mismatches between the query and reference sequences are indicated differently, depending on their nature:

- Nucleotide substitutions: a change from one character to another. For example a change from `A` in the reference sequence to `G` in the query sequence. They are shown in sequence views in [Nextclade Web](nextclade-web) as colored markers, where color signifies the resulting character (in query sequence).

- Nucleotide deletions ("gaps"): nucleotide was present in the reference sequence, but is not present in the query sequence. These are indicated by `-` in the alignment sequence. They are shown in sequence views in [Nextclade Web](nextclade-web) as dark-grey markers. In the output files deletions are represented as numeric ranges, signifying the start and end of the deleted fragment (for example: `21765-21770`)

- Nucleotide insertions (additional nucleotides in the query sequence that were not present in the reference sequence) are stripped from the alignment and reported in a separate output file, linking the position in the reference after which the insertion occured to the sequence that was inserted. `{22030: 'ACT'}` would indicate that the query sequence has the three bases `ACT` inserted between position `22030` and `22031` in the reference sequence.

Nextclade also gathers and reports other useful statistics, such as the number of contiguous ranges of `N` (missing) and non-ACGTN (ambiguous) nucleotides, as well as the total counts of substituted, deleted, missing and ambiguous nucleotides.

Similarly, aminoacid mutations and statistics are gathered from the aligned peptides obtained after translation. This step only runs if gene map is provided.
