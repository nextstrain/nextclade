## Genome annotation

A tab separated table describing the genes of the virus (name, frame, position, etc.)

The annotation is required for codon-aware alignment, for translation of CDS (CoDing Sequences), and for calling of aminoacid mutations. Without annotation (sometimes called genemap), peptide sequences will not be output and aminoacid mutations will not be detected. Without annotation the nucleotide alignment step will not be informed by codon information (see: [Algorithm: Sequence alignment](algorithm/01-sequence-alignment) and [Algorithm: Translation](algorithm/02-translation)).

Accepted formats: [GFF3](https://github.com/The-Sequence-Ontology/Specifications/blob/master/gff3.md).

Since version 3, Nextclade supports multi-part CDSs which enable the correct translation of complex features including programmed ribosomal slippage (e.g. ORF1ab in SARS-CoV-2), genes crossing the origin of a circular genome (e.g. Hepatitis B virus) and CDS that require splicing (e.g. HIV).

In theory, any syntatically correct GFF3 annotation, e.g. downloaded from Genbank, should work. However, in practice, post-processing may be required to show meaningful gene names and to reduce the number of genes.

The fundamental unit for Nextclade is a single `CDS`.

When a linked `gene` and `CDS` are present (`CDS`s specify their parents by listing the `gene`'s `ID` in the `Parent` attribute), the `gene` is effectively ignored for all purposes but display in the web UI. `CDS` segments are joined if they have the same `ID`, otherwise they are treated as independent.

Example gene map for SARS-CoV-2:

```tsv
# seqname	source	feature	start	end	score	strand	frame	attribute
.	.	gene	266	21555	.	+	.	gene=ORF1ab;ID=gene-ORF1ab
.	.	CDS	266	13468	.	+	.	gene=ORF1ab;ID=cds-ORF1ab;Parent=gene-ORF1ab
.	.	CDS	13468	21555	.	+	.	gene=ORF1ab;ID=cds-ORF1ab;Parent=gene-ORF1ab
.	.	CDS	21563	25384	.	+	.	gene=S
.	.	CDS	25393	26220	.	+	.	gene=ORF3a
.	.	CDS	26245	26472	.	+	.	gene=E
.	.	CDS	26523	27191	.	+	.	gene=M
.	.	CDS	27202	27387	.	+	.	gene=ORF6
.	.	CDS	27394	27759	.	+	.	gene=ORF7a
.	.	CDS	27756	27887	.	+	.	gene=ORF7b
.	.	CDS	27894	28259	.	+	.	gene=ORF8
.	.	CDS	28284	28577	.	+	.	gene=ORF9b
.	.	CDS	28274	29533	.	+	.	gene=N
```

More example annotations can be found in the [Nextclade data repository](https://github.com/search?q=repo%3Anextstrain%2Fnextclade_data++path%3Agenome_annotation.gff3&type=code).

Nextclade Web (advanced mode): accepted in "Genome annotation" drag & drop box.

Nextclade CLI flag: `--input-annotation`/`-m`

Note: For historical reasons, Nextclade uses _gene name_ when it really means _CDS_ name. The "gene name" is taken from the `CDS`'s first attribute found in the following list: `Gene`, `gene`, `gene_name`, `locus_tag`, `Name`, `name`, `Alias`, `alias`, `standard_name`, `old-name`, `product`, `gene_synonym`, `gb-synonym`, `acronym`, `gb-acronym`, `protein_id`, `ID`.

It is recommended that the `gene` attribute is used to specify the gene/CDS name.

> 💡 Nextclade CLI supports file compression and reading from standard input. See section [Compression, stdin](./compression) for more details.
