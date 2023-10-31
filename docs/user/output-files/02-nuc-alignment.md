# Nucleotide alignment

Aligned sequences are produced as a result of the [sequence alignment](../algorithm/01-sequence-alignment) step and are being output in FASTA format.

All alignments are with respect to the reference sequences.

Any insertions relative to the reference are stripped from the output sequences. You can find them in the analysis results files: [tabular](./04-results-tsv.md) or [json](./05-results-json.md).

Nextclade Web: download `nextclade.aligned.fasta`.

Nextclade CLI argument: `--output-fasta`/`-o` `<FILENAME>`. If the CLI flag `--include-reference` is set, the [reference sequence](../input-files/02-reference-sequence) is included as the first entry.


> ⚠️ Note that if alignment or analysis of an individual sequence fails, it is omitted from the output alignment file. See [Errors and warnings](./errors-and-warnings) section for more details.
