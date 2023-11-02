# Translations

Aligned peptides are produced as a result of the [translation and peptide alignment](../algorithm/02-translation) step and are being output in FASTA format. There are multiple files, one for each gene.

Alignments are with respect to the reference sequences.

Any insertions relative to the reference are stripped from the output sequences. You can find them in the analysis results files: [tabular](./04-results-tsv.md) or [json](./05-results-json.md).

Nextclade Web: download `nextclade.peptides.fasta.zip
` - it contains a set of FASTA files - one file per gene.

Nextclade CLI: `--output-translations`/`-P` `<TEMPLATE_STRING>`. If the CLI flag `--include-reference` is set, the reference sequence peptide is included as the first entry. This flag accepts a **template** string which **must** contain the magic template value `{gene}` exactly once. Default: `nextclade_gene_{gene}.translation.fasta`.

> ⚠️ Note that if translation, alignment or analysis of an individual gene fails, the corresponding peptide is omitted from the output translation file. See [Errors and warnings](./errors-and-warnings) section for more details.

> ⚠️ Note that if nucleotide alignment or analysis of an individual sequence fails, translation cannot be done, so none of the translations for this sequence will be present in translation files. See [Errors and warnings](./errors-and-warnings) section for more details.
