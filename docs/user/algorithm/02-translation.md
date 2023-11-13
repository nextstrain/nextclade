# 2. Translation

In order to detect changes in viral proteins, aminoacid sequences (peptides) need to be computed from the nucleotide sequence regions corresponding to [coding sequences (CDS)](https://en.wikipedia.org/wiki/Coding_region). This process is called [translation](<https://en.wikipedia.org/wiki/Translation_(biology)>). Protein sequences then need to be aligned, in order to make them comparable, similarly to how it's done with nucleotide sequences.

Nextclade performs translation separately for every CDS. CDS are specified in a genome annotation file, previously called [Gene map](../terminology.html#gene-map), and can consist of multiple segments that correspond to ranges in the genome that are combined into a contiguous CDS. The list of CDS to be considered for translation is configurable in [Nextclade CLI](../nextclade-cli) and if it's not specified, all CDS found in the annotation are translated.

For each coding sequence in the annotation, Nextclade extracts the corresponding sequence from the nucleotide alignment, and then generates peptides by taking every triplet of nucleotides (codon) and translating it into a corresponding aminoacid. It then aligns the resulting peptides against the corresponding reference peptides (translated from reference sequence), using the same alignment algorithm as for nucleotide sequences.

This step only runs if an annotation is provided.

### Results

The translation step results in aligned [Peptide](../terminology.html#peptide) sequences, which are being produced in the form of fasta files, one per CDS.

These files are written by [Nextclade CLI](../nextclade-cli) and can be downloaded in the "Download" dialog of [Nextclade Web](../nextclade-web).
