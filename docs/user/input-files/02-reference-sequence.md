## Reference sequence

Nextclade CLI: `--input-ref`/`-r`

Nextclade Web (advanced mode): accepted in "Reference sequence" drag & drop box. A remote URL is also accepted in `input-ref` URL parameter.

A nucleotide sequence which serves as a reference for the pairwise alignment of all input sequences. This is also the sequence which defines the coordinate system of the genome annotation. Mutations are called relative to this reference sequence.

The best results are obtained when the reference sequence is a well-annotated and widely used genome (e.g. from RefSeq) of a very high quality, preferably complete and unambiguous (spans entire genome and has no ambiguous nucleotides).

This is the only required input file, besides sequences to be analyzed.

Accepted formats: [FASTA](https://en.wikipedia.org/wiki/FASTA_format) file with exactly 1 sequence.

> 💡 Nextclade CLI supports file compression and reading from standard input. See section [Compression, stdin](./compression) for more details.
