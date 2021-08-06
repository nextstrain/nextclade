# 2. Translation

In order to detect changes in viral proteins, aminoacid sequences (peptides) need to be computed from the nucleotide sequence regions corresponding to [genes](https://en.wikipedia.org/wiki/Gene). This process is called [translation](<https://en.wikipedia.org/wiki/Translation_(biology)>). Protein sequences then need to be aligned, in order to make them comparable, similarly to how it's done with nucleotide sequences.

Nextclade performs translation separately for every gene. Genes are specified in a genome annotation file, also called "gene map". In simple mode [Nextclade Web](nextclade-web) uses the default gene map for each virus. In advanced mode [Nextclade Web](nextclade-web) allows to supply a custom gene map. [Nextclade CLI](nextclade-cli) and [Nextalign CLI](nextalign-cli) allow to specify the gene map file or to omit it (in which case translation step does not run). The list of genes to be considered for translation is also configurable in [Nextclade CLI](nextclade-cli) and if it's not specified, all genes found in the gene map are translated.

For each coding sequence in the gene map, Nextclade extracts the corresponding sequence from the nucleotide alignment, and then generates peptides by taking every triplet of nucleotides (codon) and translating it into a corresponding aminoacid. It then aligns the resulting peptides against the corresponding reference peptides (translated from reference sequence), using the same alignment algorithm as for nucleotide sequences.

This step only runs if the gene map is provided.
