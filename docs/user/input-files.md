# Input files

This section describes input files and their expected formats as well as how they are used in Nextclade Web, Nextclade CLI and Nextalign CLI.

## Sequence data

A set of viral nucleotide sequences to be analyzed. Also referred to as [Query sequences](terminology.html#query-sequence).

Nextclade Web (simple and advanced modes): accepted in "Sequences" drag & drop box. A remote URL is also accepted in `input-fasta` URL parameter.

Nextclade CLI and Nextalign CLI accept fasta inputs as one or multiple positional arguments. Accepts plain or compressed FASTA files. If a compressed fasta file is provided, it will be transparently decompressed. Supported compression formats: `gz`, `bz2`, `xz`, `zstd`. Decompressor is chosen based on file extension. If there's multiple input files, then different files can have different compression formats. If positional arguments provided, the plain fasta input is read from standard input (stdin).

Accepted formats: [FASTA](https://en.wikipedia.org/wiki/FASTA_format)

## Reference (root) sequence

Viral nucleotide sequence which serves as a reference for alignment and the analysis. Mutations are called relative to the reference sequence. It is expected to be the root of the [reference tree](#reference-tree). The best results are obtained when the reference sequence is a well-known consensus genome, of a very high quality, preferably complete and unambiguous (spans entire genome and has no ambiguous nucleotides).

Accepted formats: [FASTA](https://en.wikipedia.org/wiki/FASTA_format) or plain text. The file is expected to contain only 1 sequence.

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
