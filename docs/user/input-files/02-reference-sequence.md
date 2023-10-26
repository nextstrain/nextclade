## Reference sequence

A nucleotide sequence which serves as a reference for alignment and the analysis and which defines the coordinate system. Mutations are called relative to this reference sequence.

The best results are obtained when the reference sequence is a well-known consensus genome, of a very high quality, preferably complete and unambiguous (spans entire genome and has no ambiguous nucleotides).

This is the only required input file, besides sequences to be analyzed.

Accepted formats: [FASTA](https://en.wikipedia.org/wiki/FASTA_format) file with exactly 1 sequence.

Nextclade Web (advanced mode): accepted in "Root sequence" drag & drop box. A remote URL is also accepted in `input-root-sequence` URL parameter.

CLI argument: `--input-ref`/`-r`
