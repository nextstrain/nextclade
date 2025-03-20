## Genome annotation

A tab separated table describing the genes of the virus (name, frame, position, etc.)

The annotation is required for codon-aware alignment, for translation of CDS (CoDing Sequences), and for calling of amino acid mutations. Without annotation (sometimes called genemap), peptide sequences will not be output and amino acid mutations will not be detected. Without annotation the nucleotide alignment step will not be informed by codon information (see: [Algorithm: Sequence alignment](../algorithm/01-sequence-alignment.md) and [Algorithm: Translation](../algorithm/02-translation.md)).

Accepted formats: [GFF3](https://github.com/The-Sequence-Ontology/Specifications/blob/master/gff3%2Emd).

Nextclade supports multi-fragment CDSs which enable the correct translation of complex features including programmed ribosomal slippage (e.g. ORF1ab in SARS-CoV-2), genes crossing the origin of a circular genome (e.g. Hepatitis B virus) and CDS that require splicing (e.g. HIV).

Almost any syntactically correct [spec](https://github.com/The-Sequence-Ontology/Specifications/blob/master/gff3%2Emd)-compliant GFF3 annotation (e.g. downloaded from Genbank) should work. In practice, because GFF3 format allows for great freedom of how to express features as well as how to interpret them, some processing may be required to make it work satisfactory in Nextclade.

At the time of writing, due to historical and technical reasons, Nextclade's interpretation of GFF3 format has the following deviations from the specification:

- Names of genes are required to be unique
- Names of CDSes are required to be unique
- Names of proteins are required to be unique

The fundamental unit for Nextclade is a single `CDS`.

When a linked `gene` and `CDS` are present (`CDS`s specify their parents by listing the `gene`'s `ID` in the `Parent` attribute), the `gene` is effectively ignored for all purposes but display in the web UI. `CDS` segments are joined if they have the same `ID`, otherwise they are treated as independent.

Example annotations can be found in the [Nextclade data repository](https://github.com/search?q=repo%3Anextstrain%2Fnextclade_data++path%3Agenome_annotation.gff3&type=code).

Nextclade Web (advanced mode): accepted in "Genome annotation" drag & drop box.

Nextclade CLI flag: `--input-annotation`/`-m`

Note: For historical reasons, Nextclade uses _gene name_ when it really means _CDS_ name. The "gene name" is taken from the `CDS`'s first attribute found in the following list: `Gene`, `gene`, `gene_name`, `locus_tag`, `Name`, `name`, `Alias`, `alias`, `standard_name`, `old-name`, `product`, `gene_synonym`, `gb-synonym`, `acronym`, `gb-acronym`, `protein_id`, `ID`.

It is recommended that the `gene` attribute is used to specify the gene/CDS name.

> 💡 Nextclade CLI supports file compression and reading from standard input. See section [Compression, stdin](./compression.md) for more details.
