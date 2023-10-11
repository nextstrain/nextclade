# Input files v3

This section describes input files and their expected formats as well as how they are used in Nextclade Web, Nextclade CLI and Nextalign CLI.

## Sequence data

A set of viral nucleotide sequences to be analyzed. Also referred to as [Query sequences](terminology.html#query-sequence).

Nextclade Web (simple and advanced modes): accepted in "Sequences" drag & drop box. A remote URL is also accepted in `input-fasta` URL parameter.

Nextclade CLI and Nextalign CLI accept fasta inputs as one or multiple _positional arguments_. Accepts plain or compressed FASTA files. If a compressed fasta file is provided, it will be transparently decompressed. Supported compression formats: `gz`, `bz2`, `xz`, `zstd`. Decompressor is chosen based on file extension. If there's multiple input files, then different files can have different compression formats. If positional arguments provided, the plain fasta input is read from standard input (stdin).

Accepted formats: [FASTA](https://en.wikipedia.org/wiki/FASTA_format)

CLI: Positional argument(s)

## Reference (root) sequence

A nucleotide sequence which serves as a reference for alignment and the analysis. Mutations are called relative to the reference sequence. It is expected to be the root of the [reference tree](#reference-tree). The best results are obtained when the reference sequence is a well-known consensus genome, of a very high quality, preferably complete and unambiguous (spans entire genome and has no ambiguous nucleotides).

This is the only required input file, besides sequences to be analyzed.

Accepted formats: [FASTA](https://en.wikipedia.org/wiki/FASTA_format) file with exactly 1 sequence.

Nextclade Web (advanced mode): accepted in "Root sequence" drag & drop box. A remote URL is also accepted in `input-root-sequence` URL parameter.

CLI argument: `--input-ref`

## Genome annotation

A table describing the genes of the virus (name, frame, position, etc.)

The gene map is required for codon-aware alignment, for gene translation and for calling of aminoacid mutations. Without gene map, peptides will not be output and aminoacid mutations will not be detected. Without gene map the nucleotide alignment step will not be informed by codon information (see: [Algorithm: Sequence alignment](algorithm/01-sequence-alignment) and [Algorithm: Translation](algorithm/02-translation)).

Accepted formats: [GFF3](https://github.com/The-Sequence-Ontology/Specifications/blob/master/gff3.md).

Since version 3, Nextclade supports multi-part CDSs (CoDing Sequences) which occur for example due to ribosomal slippage (e.g. ORF1ab in SARS-CoV-2), circular genomes and alternative splicing (e.g. HIV).

In theory, any syntatically correct GFF3 genemap, e.g. downloaded from Genbank, should work. However, in practice, post-processing may be required to show meaningful gene names and reduce the number of genes.

The fundamental unit for Nextclade is a single `CDS`.

For historical reasons, Nextclade uses _gene name_ when it really menas _CDS_ name. The "gene name" is taken from the `CDS`'s first attribute found in the following list: `Gene`, `gene`, `gene_name`, `locus_tag`, `Name`, `name`, `Alias`, `alias`, `standard_name`, `old-name`, `product`, `gene_synonym`, `gb-synonym`, `acronym`, `gb-acronym`, `protein_id`, `ID`.

When a linked `gene` and `CDS` are present (`CDS`s specify their parents by listing the `gene`'s `ID` in the `Parent` attribute), the `gene` is effectively ignored for all purposes but display in the web UI. `CDS` segments are joined if they have the same `ID`, otherwise they are treated as independent.

Example gene map for SARS-CoV-2:

```tsv
# seqname	source	feature	start	end	score	strand	frame	attribute
.	.	gene	266	21555	.	+	.	name=ORF1ab;ID=gene-ORF1ab
.	.	CDS	266	13468	.	+	.	name=ORF1ab;ID=cds-ORF1ab;Parent=gene-ORF1ab
.	.	CDS	13468	21555	.	+	.	name=ORF1ab;ID=cds-ORF1ab;Parent=gene-ORF1ab
.	.	CDS	21563	25384	.	+	.	name=S
.	.	CDS	25393	26220	.	+	.	name=ORF3a
.	.	CDS	26245	26472	.	+	.	name=E
.	.	CDS	26523	27191	.	+	.	name=M
.	.	CDS	27202	27387	.	+	.	name=ORF6
.	.	CDS	27394	27759	.	+	.	name=ORF7a
.	.	CDS	27756	27887	.	+	.	name=ORF7b
.	.	CDS	27894	28259	.	+	.	name=ORF8
.	.	CDS	28284	28577	.	+	.	name=ORF9b
.	.	CDS	28274	29533	.	+	.	name=N
```

Nextclade Web (advanced mode): accepted in "Gene map" drag & drop box.

Nextclade CLI flag: `--input-annotation`


## Reference tree

The phylogenetic reference tree which serves as a target for phylogenetic placement (see [Algorithm: Phylogenetic placement](algorithm/05-phylogenetic-placement)). Nearest neighbour information is used to assign clades (see [Algorithm: Clade Assignment](algorithm/06-clade-assignment)) and to identify private mutations, including reversions.

The tree **must** be rooted at the sample that matches the [reference (root) sequence](#reference-root-sequence). A workaround in case one does not want to root the tree to be rooted on the reference is to attach the mutational differences between the tree root and the reference on the branch leading to the root node. This can be accomplished by passing the reference sequence to `augur ancestral`'s  `--root-sequence` argument.

The tree **must** contain a clade definition for every node (including internal): every node must have a value at `node_attrs.clade_membership`.

The tree **should** be sufficiently large and diverse to meet clade assignment expectations of a particular use-case, study or experiment. Only clades present on the reference tree can be assigned to [Query sequences](terminology.html#query-sequence).

Nextclade Web (advanced mode): accepted in "Reference tree" drag & drop box. A remote URL is also accepted in `input-tree` URL parameter.

Accepted formats: Auspice JSON v2 ([description](https://nextstrain.org/docs/bioinformatics/data-formats), [schema](https://github.com/nextstrain/augur/blob/master/augur/data/schema-export-v2.json)) - this is the same format that is used in Nextstrain. It is produced by [Nextstrain Augur](https://docs.nextstrain.org/projects/augur/en/stable/index.html) and consumed by [Nextstrain Auspice](https://docs.nextstrain.org/projects/auspice/en/stable/). Refer to Nextstrain documentation at [https://docs.nextstrain.org](https://docs.nextstrain.org) on how to build your own trees.

Nextclade CLI flag: `--input-tree`

## Pathogen configuration (`pathogen.json`)

General Nextclade dataset configuration needs to be passed in the JSON config file `pathogen.json`.

Top level keys and their values are detailed below.

### Required

#### `schemaVersion`

Required. Currently `3.0.0`.

#### `attributes`

Required. General dataset metadata. `name` and `reference` are required, each need to have a `value`. Human readable `valueFriendly` is optional.

```json
"attributes": {
  "name": {
    "value": "sars-cov-2-21L",
    "valueFriendly": "SARS-CoV-2 rooted on BA.2"
  },
  "reference": {
    "value": "BA.2"
  }
}
```

#### `files`

Required `dict[str, str,]`. Tells Nextclade what other dataset input files are called. Only `reference` and `pathogenJson` are required. Other files are optional. `examples` are example sequences for the dataset.

Example dict:

```json
{
  "reference": "reference.fasta",
  "pathogenJson": "pathogen.json",
  "genomeAnnotation": "genomeAnnotation.gff3",
  "treeJson": "tree.json",
  "examples": "sequences.fasta",
  "readme": "readme.md",
  "changelog": "changelog.md"
}
```

### Optional

#### `qc`

Optional `dict`. Quality control (QC) configuration. If not provided, Nextclade does not do any QC checks.

Example configuration for SARS-CoV-2:

```json
{
  "schemaVersion": "1.2.0",
  "privateMutations": {
    "enabled": true,
    "typical": 8,
    "cutoff": 24,
    "weightLabeledSubstitutions": 4,
    "weightReversionSubstitutions": 6,
    "weightUnlabeledSubstitutions": 1
  },
  "missingData": {
    "enabled": true,
    "missingDataThreshold": 2700,
    "scoreBias": 300
  },
  "snpClusters": {
    "enabled": true,
    "windowSize": 100,
    "clusterCutOff": 6,
    "scoreWeight": 50
  },
  "mixedSites": {
    "enabled": true,
    "mixedSitesThreshold": 10
  },
  "frameShifts": {
    "enabled": true,
    "ignoredFrameShifts": [
      { "geneName": "ORF3a", "codonRange": {"begin": 256, "end": 276 } },
      { "geneName": "ORF3a", "codonRange": {"begin": 258, "end": 276 } },
    ]
  },
  "stopCodons": {
    "enabled": true,
    "ignoredStopCodons": [
      {"geneName": "ORF8", "codon": 26},
      {"geneName": "ORF8", "codon": 67}
    ]
  }
}
```

Note that the positions are 0-indexed and codon range ends are excluded. So `ORF3a:257-276` should be encoded as `{"begin": 256, "end": 276 }`.

#### `compatibility`

Optional. Minimum Nextclade CLI/web version required to use this dataset. If not provided, no compatibility checks are performed.

Example:

```json
{
  "cli": "3.0.0",
  "web": "3.0.0",
}
```

#### `deprecated`

Optional `bool`. Whether the dataset is deprecated and should not be used for new analyses. Default: `false`.

#### `enabled`

Optional `bool`. Whether the dataset is enabled (should be shown in Nextclade web). Default: `true`.

#### `experimental`

Optional `bool`. Whether the dataset is experimental. Default: `false`.

#### `defaultGene`

Optional `str`. The default gene to be shown in Nextclade web. If not provided, the nucleotide alignment is shown. Example value: `"S"`.

#### `geneOrderPreference`

Optional `array[str]`. Order in which genes are shown in Nextclade web dropdown.

#### `generalParams`

Optional `dict[str,bool]`. General parameters that affect the analysis. These are identical to the corresponding CLI arguments. If not provided, default values are used.

- `includeReference`: Whether to include aligned reference nucleotide sequence into output nucleotide sequence FASTA file and reference peptides into output peptide FASTA files.
- `inOrder`: Emit output sequences in-order. With this flag the program will wait for results from the previous sequences to be written to the output files before writing the results of the next sequences, preserving the same order as in the input file. Due to variable sequence processing times, this might introduce unnecessary waiting times, but ensures that the resulting sequences are written in the same order as they occur in the inputs (except for sequences which have errors). By default, without this flag, processing might happen out of order, which is faster, due to the elimination of waiting, but might also lead to results written out of order - the order of results is not specified and depends on thread scheduling and processing times of individual sequences. This option is only relevant when `--jobs` is greater than 1 or is omitted. Note: the sequences which trigger errors during processing will be omitted from outputs, regardless of this flag.
- `replaceUnknown`: Replace unknown nucleotide characters with 'N'. By default, the sequences containing unknown nucleotide characters are skipped with a warning - they are not analyzed and not included into results. If this flag is provided, then before the alignment, all unknown characters are replaced with 'N'. This replacement allows to analyze these sequences.  The following characters are considered known:  '-', 'A', 'B', 'C', 'D', 'G', 'H', 'K', 'M', 'N', 'R', 'S', 'T', 'V', 'W', 'Y'.

#### `alignmentParams`

Optional `dict`. Parameters that affect the alignment. These are identical to the corresponding CLI arguments (though here _camelCase_ needs to be used. If not provided, default values are used.

#### `treeBuilderParams`

Optional `dict`. Parameters that affect the tree building. These are identical to the corresponding CLI arguments (though here _camelCase_ needs to be used. If not provided, default values are used.

- `withoutGreedyTreeBuilder`: If you want to use the greedy tree builder, set this to `true`.
- `maskedMutsWeight`: Parsimony weight for masked mutations. Default: `0.05`.

# Input files v2

This section describes input files and their expected formats as well as how they are used in Nextclade Web, Nextclade CLI and Nextalign CLI.

## Sequence data

A set of viral nucleotide sequences to be analyzed. Also referred to as [Query sequences](terminology.html#query-sequence).

Nextclade Web (simple and advanced modes): accepted in "Sequences" drag & drop box. A remote URL is also accepted in `input-fasta` URL parameter.

Nextclade CLI and Nextalign CLI accept fasta inputs as one or multiple positional arguments. Accepts plain or compressed FASTA files. If a compressed fasta file is provided, it will be transparently decompressed. Supported compression formats: `gz`, `bz2`, `xz`, `zstd`. Decompressor is chosen based on file extension. If there's multiple input files, then different files can have different compression formats. If positional arguments provided, the plain fasta input is read from standard input (stdin).

Accepted formats: [FASTA](https://en.wikipedia.org/wiki/FASTA_format)

## Reference (root) sequence

Viral nucleotide sequence which serves as a reference for alignment and the analysis. Mutations are called relative to the reference sequence. It is expected to be the root of the [reference tree](#reference-tree). The best results are obtained when the reference sequence is a well-known consensus genome, of a very high quality, preferably complete and unambiguous (spans entire genome and has no ambiguous nucleotides).

Accepted formats: [FASTA](https://en.wikipedia.org/wiki/FASTA_format) file containing exactly 1 sequence.

Nextclade Web (advanced mode): accepted in "Root sequence" drag & drop box. A remote URL is also accepted in `input-root-sequence` URL parameter.

CLI argument: `--input-ref`

## Reference tree

The phylogenetic reference tree which serves as a target for phylogenetic placement (see [Algorithm: Phylogenetic placement](algorithm/05-phylogenetic-placement)). Nearest neighbour information is used to assign clades (see [Algorithm: Clade Assignment](algorithm/06-clade-assignment)) and to identify private mutations, including reversions.

The tree **must** be rooted at the sample that matches the [reference (root) sequence](#reference-root-sequence).

The tree **must** contain a clade definition for every node (including internal).

The tree **must** be sufficiently large, diverse and to meet clade assignment expectations of a particular use-case, study or experiment. Only clades present on the reference tree can be assigned to [Query sequences](terminology.html#query-sequence).

Nextclade Web (advanced mode): accepted in "Reference tree" drag & drop box. A remote URL is also accepted in `input-tree` URL parameter.

Nextclade CLI flag: `--input-tree`

Accepted formats: Auspice JSON v2 ([description](https://nextstrain.org/docs/bioinformatics/data-formats), [schema](https://github.com/nextstrain/augur/blob/master/augur/data/schema-export-v2.json)) - this is the same format that is used in Nextstrain. It is produced by [Nextstrain Augur](https://docs.nextstrain.org/projects/augur/en/stable/index.html) and consumed by [Nextstrain Auspice](https://docs.nextstrain.org/projects/auspice/en/stable/). Refer to Nextstrain documentation at [https://docs.nextstrain.org](https://docs.nextstrain.org) on how to build your own trees.

## Quality control (QC) configuration

A set of parameters and thresholds used to configure the QC checks. These should be tuned for the particular study or experiment, considering quality and tolerances of sequencing results of a given laboratory.

Nextclade Web (advanced mode): accepted in "Quality control" drag & drop box.

Nextclade CLI flag: `--input-qc-config`

Accepted formats: JSON. Example configuration for SARS-CoV-2:

```json
{
  "schemaVersion": "1.2.0",
  "privateMutations": {
    "enabled": true,
    "typical": 8,
    "cutoff": 24,
    "weightLabeledSubstitutions": 4,
    "weightReversionSubstitutions": 6,
    "weightUnlabeledSubstitutions": 1
  },
  "missingData": {
    "enabled": true,
    "missingDataThreshold": 2700,
    "scoreBias": 300
  },
  "snpClusters": {
    "enabled": true,
    "windowSize": 100,
    "clusterCutOff": 6,
    "scoreWeight": 50
  },
  "mixedSites": {
    "enabled": true,
    "mixedSitesThreshold": 10
  },
  "frameShifts": {
    "enabled": true,
    "ignoredFrameShifts": [
      { "geneName": "ORF3a", "codonRange": {"begin": 256, "end": 276 } },
      { "geneName": "ORF3a", "codonRange": {"begin": 258, "end": 276 } },
    ]
  },
  "stopCodons": {
    "enabled": true,
    "ignoredStopCodons": [
      {"geneName": "ORF8", "codon": 26},
      {"geneName": "ORF8", "codon": 67}
    ]
  }
}
```

Note that the positions are 0-indexed and codon range ends are excluded. So `ORF3a:257-276` should be encoded as `{"begin": 256, "end": 276 }`.

## Gene map

(or "genome annotations")

A table describing the genes of the virus (name, frame, position, etc.)

The gene map is required for codon-aware alignment, for gene translation and for calling of aminoacid mutations. Without gene map, peptides will not be output and aminoacid mutations will not be detected. Without gene map the nucleotide alignment step will not be informed by codon information (see: [Algorithm: Sequence alignment](algorithm/01-sequence-alignment) and [Algorithm: Translation](algorithm/02-translation)). Since version `1.10.0` (web `1.13.0`) negative strands are supported, too.

Accepted formats: [GFF3](https://github.com/The-Sequence-Ontology/Specifications/blob/master/gff3.md). Example gene map for SARS-CoV-2:

```tsv
# seqname	source	feature	start	end	score	strand	frame	attribute
.	.	gene	26245	26472	.	+	.	gene_name=E
.	.	gene	26523	27191	.	+	.	gene_name=M
.	.	gene	28274	29533	.	+	.	gene_name=N
.	.	gene	266  	13468	.	+	.	gene_name=ORF1a
.	.	gene	13468	21555	.	+	.	gene_name=ORF1b
.	.	gene	25393	26220	.	+	.	gene_name=ORF3a
.	.	gene	27202	27387	.	+	.	gene_name=ORF6
.	.	gene	27394	27759	.	+	.	gene_name=ORF7a
.	.	gene	27756	27887	.	+	.	gene_name=ORF7b
.	.	gene	27894	28259	.	+	.	gene_name=ORF8
.	.	gene	28284	28577	.	+	.	gene_name=ORF9b
.	.	gene	21563	25384	.	+	.	gene_name=S
```

Nextclade Web (advanced mode): accepted in "Gene map" drag & drop box.

Nextclade CLI flag: `--input-gene-map`

Nextalign CLI flag: `--gene-map`

## PCR primers

A table that describes a set of PCR primers that might be used for PCR tests of the virus.

Used to detect changes in PCR primer regions. Without this table these checks will not be performed.

Nextclade Web (advanced mode): accepted in "PCR primers" drag & drop box.

Nextclade CLI flag: `--input-pcr-primers`

Accepted formats: CSV with the following 4 columns "Institute (Country),TargetGene,PrimerName,Sequence". Example table of PCR primers for SARS-CoV-2:

```csv
Country (Institute),Target,Oligonucleotide ,Sequence
Charité (Germany)  ,RdRp  ,Charité_RdRp_F  ,GTGARATGGTCATGTGTGGCGG
Charité (Germany)  ,RdRp  ,Charité_S_RdRp_P,CAGGTGGAACCTCATCAGGAGATGC
Charité (Germany)  ,RdRp  ,Charité_RdRp_R  ,CARATGTTAAASACACTATTAGCATA
Charité (Germany)  ,E     ,Charité_E_F     ,ACAGGTACGTTAATAGTTAATAGCGT
Charité (Germany)  ,E     ,Charité_E_P     ,ACACTAGCCATCCTTACTGCGCTTCG
Charité (Germany)  ,E     ,Charité_E_R     ,ATATTGCAGCAGTACGCACACA
Charité (Germany)  ,N     ,Charité_N_F     ,CACATTGGCACCCGCAATC
Charité (Germany)  ,N     ,Charité_N_P     ,ACTTCCTCAAGGAACAACATTGCCA
Charité (Germany)  ,N     ,Charité_N_R     ,GAGGAACGAGAAGAGGCTTG
```

Note: the primers are processed differently depending on the primer type. The type is deduced from the suffix of primer's name (3rd column). Conventions that are used:

- `_F` - forward primer
- `_R` - reverse primer
- `_P` - probe

## Virus properties

_Introduced in CLI version `1.10.0`, web `1.13.0`_

Private mutations are split into 3 categories: reversion, labeled mutations and unlabeled mutations.

Through the `virus_properties.json` config file, Nextclade is told which mutations to attach which labels to.

Private mutations to a genotype listed in the file are given the labels given in the file.

It is of the following schema (shortened for clarity):

```json
{
  "schemaVersion": "1.10.0",
  "nucMutLabelMap": {
    "174T": [
      "20H"
    ],
    "204T": [
      "20E",
      "21J"
    ]
  },
  "nucMutLabelMapReverse": {
    "19A": [
      "11083T",
      "14805T",
      "26144T"
    ],
    "19B": [
      "8782T",
      "9477A",
    ]
  }
}
```

Positions are 1-indexed.

Nextclade Web (advanced mode): accepted in "Virus properties" drag & drop box.

Nextclade CLI flag: `--input-virus-properties`
