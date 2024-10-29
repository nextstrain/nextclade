# Reference


This document contains the automatically generated reference documentation for command-line arguments of the latest version of Nextclade CLI.

If you have Nextclade CLI installed, you can type `nextclade --help` to read the latest documentation for your installed version of Nextclade.
  

**Command Overview:**

* [`nextclade`↴](#nextclade)
* [`nextclade completions`↴](#nextclade-completions)
* [`nextclade run`↴](#nextclade-run)
* [`nextclade dataset`↴](#nextclade-dataset)
* [`nextclade dataset list`↴](#nextclade-dataset-list)
* [`nextclade dataset get`↴](#nextclade-dataset-get)
* [`nextclade sort`↴](#nextclade-sort)
* [`nextclade read-annotation`↴](#nextclade-read-annotation)
* [`nextclade help-markdown`↴](#nextclade-help-markdown)

## `nextclade`

Viral genome alignment, mutation calling, clade assignment, quality checks and phylogenetic placement.

Nextclade is a part of Nextstrain: [https://nextstrain.org](https://nextstrain.org)

Documentation: [https://docs.nextstrain.org/projects/nextclade](https://docs.nextstrain.org/projects/nextclade)

Nextclade Web: [https://clades.nextstrain.org](https://clades.nextstrain.org)

Publication: [https://doi.org/10.21105/joss.03773](https://doi.org/10.21105/joss.03773)

For short help type: `nextclade -h`, for extended help type: `nextclade --help`. Each subcommand has its own help, for example: `nextclade run --help`.

**Usage:** `nextclade [OPTIONS] <COMMAND>`

###### **Subcommands:**

* `completions` — Generate shell completions
* `run` — Run sequence analysis: alignment, mutation calling, clade assignment, quality checks and phylogenetic placement
* `dataset` — List and download available Nextclade datasets (pathogens)
* `sort` — Sort sequences according to the inferred Nextclade dataset (pathogen)
* `read-annotation` — Read genome annotation and present it in Nextclade's internal formats. This is mostly only useful for Nextclade maintainers and the most curious users. Note that these internal formats have no stability guarantees and can be changed at any time without notice
* `help-markdown` — Print command-line reference documentation in Markdown format

###### **Options:**

* `--verbosity <VERBOSITY>` — Set verbosity level of console output

  Default value: `warn`

  Possible values: `off`, `error`, `warn`, `info`, `debug`, `trace`

* `--silent` — Disable all console output. Same as `--verbosity=off`
* `-v`, `--verbose` — Make console output more verbose. Add multiple occurrences to increase verbosity further
* `-q`, `--quiet` — Make console output more quiet. Add multiple occurrences to make output even more quiet



## `nextclade completions`

Generate shell completions.

This will print the completions file contents to the console. Refer to your shell's documentation on how to install the completions.

Example for Ubuntu Linux:

nextclade completions bash > ~/.local/share/bash-completion/nextclade

**Usage:** `nextclade completions [SHELL]`

###### **Arguments:**

* `<SHELL>` — Name of the shell to generate appropriate completions

  Default value: `bash`

  Possible values: `bash`, `elvish`, `fish`, `fig`, `powershell`, `zsh`




## `nextclade run`

Run sequence analysis: alignment, mutation calling, clade assignment, quality checks and phylogenetic placement

For short help type: `nextclade -h`, for extended help type: `nextclade --help`. Each subcommand has its own help, for example: `nextclade run --help`.

**Usage:** `nextclade run [OPTIONS] [INPUT_FASTAS]...`

###### **Arguments:**

* `<INPUT_FASTAS>` — Path to one or multiple FASTA files with input sequences

   Supports the following compression formats: "gz", "bz2", "xz", "zst". If no files provided, the plain fasta input is read from standard input (stdin).

   See: https://en.wikipedia.org/wiki/FASTA_format

###### **Options:**



   Example: nextclade run -D dataset/ -O out/ seq1.fasta seq2.fasta
* `-D`, `--input-dataset <INPUT_DATASET>` — Path to a directory or a zip file containing a dataset.

   See `nextclade dataset --help` on how to obtain datasets.

   If this flag is not provided, no dataset will be loaded and individual input files have to be provided instead. In this case  `--input-ref` is required and `--input-annotation, `--input-tree` and `--input-pathogen-json` are optional.

   If both the `--input-dataset` and individual `--input-*` flags are provided, each individual flag overrides the corresponding file in the dataset.

   Experimental feature: this argument also accepts a path to Auspice JSON file. In this case the files to be treated as a Nextclade dataset. This requires Auspice JSON file which contains `.root_sequence.nuc` field.

   Please refer to Nextclade documentation for more details about Nextclade datasets and their files.
* `-d`, `--dataset-name <DATASET_NAME>` — Name of the dataset to download and use during the run

   This is a convenience shortcut to first downloading a dataset and then immediately running with it. Providing this flag is equivalent to running 2 commands: `dataset get` followed by `run`, with the difference that the dataset files from the first command are not saved to disk and cannot be reused later. The default parameters are used for the dataset (e.g. default reference name and latest version tag).

   See `dataset get --help` and `dataset list --help` for more details.

   Note that when using this flag, the dataset will be downloaded on every run. If a new version of the dataset is released between two runs, they will use different versions of the dataset and may produce different results. For the most reproducible runs, and for more control, use the usual 2-step flow with `dataset get` followed by `run`.

   This flag is mutually exclusive with `--input_dataset`
* `-r`, `--input-ref <INPUT_REF>` — Path to a FASTA file containing reference sequence. This file should contain exactly 1 sequence.

   Overrides path to `reference.fasta` in the dataset (`--input-dataset`).

   Supports the following compression formats: "gz", "bz2", "xz", "zst". Use "-" to read uncompressed data from standard input (stdin).
* `-a`, `--input-tree <INPUT_TREE>` — Path to Auspice JSON v2 file containing reference tree.

   See https://nextstrain.org/docs/bioinformatics/data-formats.

   Overrides path to `tree.json` in the dataset (`--input-dataset`).

   Supports the following compression formats: "gz", "bz2", "xz", "zst". Use "-" to read uncompressed data from standard input (stdin).
* `-p`, `--input-pathogen-json <INPUT_PATHOGEN_JSON>` — Path to a JSON file containing configuration and data specific to a pathogen.

   Overrides path to `pathogen.json` in the dataset (`--input-dataset`).

   Supports the following compression formats: "gz", "bz2", "xz", "zst". Use "-" to read uncompressed data from standard input (stdin).
* `-m`, `--input-annotation <INPUT_ANNOTATION>` — Path to a file containing genome annotation in GFF3 format.

   Genome annotation is used to find coding regions. If not supplied, coding regions will not be translated, amino acid sequences will not be output, amino acid mutations will not be detected and nucleotide sequence alignment will not be informed by codon boundaries.

   List of CDSes can be restricted using `--cds-selection` argument. Otherwise, all CDSes found in the genome annotation will be used.

   Overrides genome annotation provided by the dataset (`--input-dataset` or `--dataset-name`).

   Learn more about Generic Feature Format Version 3 (GFF3): https://github.com/The-Sequence-Ontology/Specifications/blob/master/gff3.md

   Supports the following compression formats: "gz", "bz2", "xz", "zst". Use "-" to read uncompressed data from standard input (stdin).
* `-g`, `--cds-selection <CDS_SELECTION>` — Comma-separated list of names of coding sequences (CDSes) to use.

   This defines which peptides will be written into outputs, and which CDS will be taken into account during codon-aware alignment and aminoacid mutations detection. Must only contain CDS names present in the genome annotation.

   If this flag is not supplied or its value is an empty string, then all CDSes found in the genome annotation will be used.
* `--input-pcr-primers <INPUT_PCR_PRIMERS>` — Path to a CSV file containing a list of custom PCR primer sites. This information is used to report mutations in these sites.

   Supports the following compression formats: "gz", "bz2", "xz", "zstd". Use "-" to read uncompressed data from standard input (stdin).
* `--server <SERVER>` — Use custom dataset server








* `-O`, `--output-all <OUTPUT_ALL>` — Produce all of the output files into this directory, using default basename and predefined suffixes and extensions. This is equivalent to specifying each of the individual `--output-*` flags. Convenient when you want to receive all or most of output files into the same directory and don't care about their filenames.

   Output files can be optionally included or excluded using `--output-selection` flag. The base filename can be set using `--output-basename` flag.

   If both the `--output-all` and individual `--output-*` flags are provided, each individual flag overrides the corresponding default output path.

   At least one of the output flags is required: `--output-all`, `--output-fasta`, `--output-ndjson`, `--output-json`, `--output-csv`, `--output-tsv`, `--output-tree`, `--output-translations`.

   If the required directory tree does not exist, it will be created.
* `-n`, `--output-basename <OUTPUT_BASENAME>` — Set the base filename to use for output files.

   By default the base filename is extracted from the input sequences file (provided with `--input-fasta`).

   Only valid together with `--output-all` flag.
* `-s`, `--output-selection <OUTPUT_SELECTION>` — Restricts outputs for `--output-all` flag.

   Should contain a comma-separated list of names of output files to produce.

   If 'all' is present in the list, then all other entries are ignored and all outputs are produced.

   Only valid together with `--output-all` flag.

  Possible values: `all`, `fasta`, `json`, `ndjson`, `csv`, `tsv`, `tree`, `tree-nwk`, `translations`

* `-o`, `--output-fasta <OUTPUT_FASTA>` — Path to output FASTA file with aligned sequences.

   Takes precedence over paths configured with `--output-all`, `--output-basename` and `--output-selection`.

   If the provided file path ends with one of the supported extensions: "gz", "bz2", "xz", "zst", then the file will be written compressed. Use "-" to write the uncompressed to standard output (stdout).

   If the required directory tree does not exist, it will be created.
* `-P`, `--output-translations <OUTPUT_TRANSLATIONS>` — Template string for path to output fasta files containing translated and aligned peptides. A separate file will be generated for every gene.

   The string should contain template variable `{cds}`, where the gene name will be substituted. Make sure you properly quote and/or escape the curly braces, so that your shell, programming language or pipeline manager does not attempt to substitute the variables.

   Takes precedence over paths configured with `--output-all`, `--output-basename` and `--output-selection`.

   If the provided file path ends with one of the supported extensions: "gz", "bz2", "xz", "zst", then the file will be written compressed. Use "-" to write the uncompressed to standard output (stdout).

   If the required directory tree does not exist, it will be created.

   Example for bash shell:

   --output-translations='output_dir/nextclade.cds_translation.{cds}.fasta'
* `-N`, `--output-ndjson <OUTPUT_NDJSON>` — Path to output Newline-delimited JSON (NDJSON) results file.

   This file format is most suitable for further machine processing of the results. By contrast to plain json, it can be streamed line-by line, so much bigger outputs are feasible.

   Takes precedence over paths configured with `--output-all`, `--output-basename` and `--output-selection`.

   If the provided file path ends with one of the supported extensions: "gz", "bz2", "xz", "zst", then the file will be written compressed. Use "-" to write the uncompressed to standard output (stdout).

   If the required directory tree does not exist, it will be created.
* `-J`, `--output-json <OUTPUT_JSON>` — Path to output JSON results file.

   This file format is most suitable for further machine processing of the results.

   Takes precedence over paths configured with `--output-all`, `--output-basename` and `--output-selection`.

   If the provided file path ends with one of the supported extensions: "gz", "bz2", "xz", "zst", then the file will be written compressed. Use "-" to write the uncompressed to standard output (stdout).

   If the required directory tree does not exist, it will be created.
* `-c`, `--output-csv <OUTPUT_CSV>` — Path to output CSV results file (delimiter: semicolon)

   This file format is most suitable for human inspection as well as for limited further machine processing of the results.

   CSV and TSV output files are equivalent and only differ in the column delimiters.

   Takes precedence over paths configured with `--output-all`, `--output-basename` and `--output-selection`.

   If the provided file path ends with one of the supported extensions: "gz", "bz2", "xz", "zst", then the file will be written compressed. Use "-" to write the uncompressed to standard output (stdout).

   If the required directory tree does not exist, it will be created.
* `-t`, `--output-tsv <OUTPUT_TSV>` — Path to output TSV results file (delimiter: tab)

   This file format is most suitable for human inspection as well as for limited further machine processing of the results.

   CSV and TSV output files are equivalent and only differ in the column delimiters.

   Takes precedence over paths configured with `--output-all`, `--output-basename` and `--output-selection`.

   If the provided file path ends with one of the supported extensions: "gz", "bz2", "xz", "zst", then the file will be written compressed. Use "-" to write the uncompressed to standard output (stdout).

   If the required directory tree does not exist, it will be created.
* `-C`, `--output-columns-selection <OUTPUT_COLUMNS_SELECTION>` — Restricts columns written into tabular output files (CSV and TSV).

   Should contain a comma-separated list of individual column names and/or column category names to include into both CSV and TSV outputs.

   If this flag is omitted, or if category 'all' is present in the list, then all other entries are ignored and all columns are written.

   Only valid together with one or multiple of flags: `--output-csv`, `--output-tsv`, `--output-all`.
* `--output-graph <OUTPUT_GRAPH>` — Path to output phylogenetic graph with input sequences placed onto it, in Nextclade graph JSON format.

   Currently this format is not stable and not documented. It can change at any time without a warning. Use it at own risk.

   Due to format limitations, it is only feasible to construct the tree for at most a few hundred to a few thousand sequences. If the tree is not needed, omitting this flag reduces processing time and memory consumption.

   Takes precedence over paths configured with `--output-all`, `--output-basename` and `--output-selection`.

   If the provided file path ends with one of the supported extensions: "gz", "bz2", "xz", "zst", then the file will be written compressed. Use "-" to write the uncompressed to standard output (stdout).

   If the required directory tree does not exist, it will be created.
* `-T`, `--output-tree <OUTPUT_TREE>` — Path to output phylogenetic tree with input sequences placed onto it, in Auspice JSON V2 format.

   For file format description see: https://nextstrain.org/docs/bioinformatics/data-formats

   Due to format limitations, it is only feasible to construct the tree for at most a few hundred to a few thousand sequences. If the tree is not needed, omitting this flag reduces processing time and memory consumption.

   Takes precedence over paths configured with `--output-all`, `--output-basename` and `--output-selection`.

   If the provided file path ends with one of the supported extensions: "gz", "bz2", "xz", "zst", then the file will be written compressed. Use "-" to write the uncompressed to standard output (stdout).

   If the required directory tree does not exist, it will be created.
* `--output-tree-nwk <OUTPUT_TREE_NWK>` — Path to output phylogenetic tree with input sequences placed onto it, in Newick format (New Hampshire tree format)

   For file format description see: https://en.wikipedia.org/wiki/Newick_format

   Takes precedence over paths configured with `--output-all`, `--output-basename` and `--output-selection`.

   If the provided file path ends with one of the supported extensions: "gz", "bz2", "xz", "zst", then the file will be written compressed. Use "-" to write the uncompressed to standard output (stdout).

   If the required directory tree does not exist, it will be created.


* `--include-reference <INCLUDE_REFERENCE>` — Whether to include aligned reference nucleotide sequence into output nucleotide sequence FASTA file and reference peptides into output peptide FASTA files

  Possible values: `true`, `false`

* `--include-nearest-node-info <INCLUDE_NEAREST_NODE_INFO>` — Whether to include the list of nearest nodes to the outputs

  Possible values: `true`, `false`

* `--in-order <IN_ORDER>` — Emit output sequences in-order.

   With this flag the program will wait for results from the previous sequences to be written to the output files before writing the results of the next sequences, preserving the same order as in the input file. Due to variable sequence processing times, this might introduce unnecessary waiting times, but ensures that the resulting sequences are written in the same order as they occur in the inputs (except for sequences which have errors). By default, without this flag, processing might happen out of order, which is faster, due to the elimination of waiting, but might also lead to results written out of order - the order of results is not specified and depends on thread scheduling and processing times of individual sequences.

   This option is only relevant when `--jobs` is greater than 1 or is omitted.

   Note: the sequences which trigger errors during processing will be omitted from outputs, regardless of this flag.

  Possible values: `true`, `false`

* `--replace-unknown <REPLACE_UNKNOWN>` — Replace unknown nucleotide characters with 'N'

   By default, the sequences containing unknown nucleotide characters are skipped with a warning - they are not analyzed and not included into results. If this flag is provided, then before the alignment, all unknown characters are replaced with 'N'. This replacement allows to analyze these sequences.

   The following characters are considered known:  '-', 'A', 'B', 'C', 'D', 'G', 'H', 'K', 'M', 'N', 'R', 'S', 'T', 'V', 'W', 'Y'

  Possible values: `true`, `false`

* `--without-greedy-tree-builder <WITHOUT_GREEDY_TREE_BUILDER>` — Disable greedy tree builder algorithm

  Possible values: `true`, `false`

* `--masked-muts-weight <MASKED_MUTS_WEIGHT>`
* `--min-length <MIN_LENGTH>` — Minimum length of nucleotide sequence to consider for alignment.

   If a sequence is shorter than that, alignment will not be attempted and a warning will be emitted. When adjusting this parameter, note that alignment of short sequences can be unreliable.
* `--penalty-gap-extend <PENALTY_GAP_EXTEND>` — Penalty for extending a gap in alignment. If zero, all gaps regardless of length incur the same penalty
* `--penalty-gap-open <PENALTY_GAP_OPEN>` — Penalty for opening of a gap in alignment. A higher penalty results in fewer gaps and more mismatches. Should be less than `--penalty-gap-open-in-frame` to avoid gaps in genes
* `--penalty-gap-open-in-frame <PENALTY_GAP_OPEN_IN_FRAME>` — As `--penalty-gap-open`, but for opening gaps at the beginning of a codon. Should be greater than `--penalty-gap-open` and less than `--penalty-gap-open-out-of-frame`, to avoid gaps in genes, but favor gaps that align with codons
* `--penalty-gap-open-out-of-frame <PENALTY_GAP_OPEN_OUT_OF_FRAME>` — As `--penalty-gap-open`, but for opening gaps in the body of a codon. Should be greater than `--penalty-gap-open-in-frame` to favor gaps that align with codons
* `--penalty-mismatch <PENALTY_MISMATCH>` — Penalty for aligned nucleotides or amino acids that differ in state during alignment. Note that this is redundantly parameterized with `--score-match`
* `--score-match <SCORE_MATCH>` — Score for matching states in nucleotide or amino acid alignments
* `--max-band-area <MAX_BAND_AREA>` — Maximum area of the band in the alignment matrix. Alignments with large bands are slow to compute and require substantial memory. Alignment of sequences requiring bands with area larger than this value, will not be attempted and a warning will be emitted
* `--retry-reverse-complement <RETRY_REVERSE_COMPLEMENT>` — Retry seed matching step with a reverse complement if the first attempt failed

  Possible values: `true`, `false`

* `--no-translate-past-stop <NO_TRANSLATE_PAST_STOP>` — If this flag is present, the amino acid sequences will be truncated at the first stop codon, if mutations or sequencing errors cause premature stop codons to be present. No amino acid mutations in the truncated region will be recorded

  Possible values: `true`, `false`

* `--excess-bandwidth <EXCESS_BANDWIDTH>` — Excess bandwidth for internal stripes
* `--terminal-bandwidth <TERMINAL_BANDWIDTH>` — Excess bandwidth for terminal stripes
* `--gap-alignment-side <GAP_ALIGNMENT_SIDE>` — Whether to align gaps on the left or right side if equally parsimonious. Default: left

  Possible values: `left`, `right`

* `--kmer-length <KMER_LENGTH>` — Length of exactly matching k-mers used in the seed alignment of the query to the reference
* `--kmer-distance <KMER_DISTANCE>` — Interval of successive k-mers on the query sequence. Should be small compared to the query length
* `--allowed-mismatches <ALLOWED_MISMATCHES>` — Exactly matching k-mers are extended to the left and right until more than `allowed_mismatches` are observed in a sliding window (`window_size`)
* `--window-size <WINDOW_SIZE>` — Size of the window within which mismatches are accumulated during seed extension
* `--min-match-length <MIN_MATCH_LENGTH>` — Minimum length of extended k-mers
* `--min-seed-cover <MIN_SEED_COVER>` — Fraction of the query sequence that has to be covered by extended seeds to proceed with the banded alignment
* `--max-alignment-attempts <MAX_ALIGNMENT_ATTEMPTS>` — Number of times Nextclade will retry alignment with more relaxed results if alignment band boundaries are hit






* `-j`, `--jobs <JOBS>` — Number of processing jobs. If not specified, all available CPU threads will be used



## `nextclade dataset`

List and download available Nextclade datasets (pathogens)

For short help type: `nextclade -h`, for extended help type: `nextclade --help`. Each subcommand has its own help, for example: `nextclade dataset --help`.

**Usage:** `nextclade dataset <COMMAND>`

###### **Subcommands:**

* `list` — List available Nextclade datasets
* `get` — Download available Nextclade datasets



## `nextclade dataset list`

List available Nextclade datasets

For short help type: `nextclade -h`, for extended help type: `nextclade --help`. Each subcommand has its own help, for example: `nextclade run --help`.

**Usage:** `nextclade dataset list [OPTIONS]`

###### **Options:**

* `-n`, `--name <NAME>` — Restrict list to datasets with this *exact* name.

   Can be used to test if a dataset exists.

   Mutually exclusive with --search
* `-s`, `--search <SEARCH>` — Search datasets by name or by reference.

   Will only display datasets containing this substring in their name (path), or either of attributes: "name", "reference name", "reference accession".

   Mutually exclusive with --name
* `-t`, `--tag <TAG>` — Restrict list to datasets with this exact version tag
* `--include-incompatible` — Include dataset versions that are incompatible with this version of Nextclade CLI
* `--include-deprecated` — Include deprecated datasets.

   Authors can mark a dataset as deprecated to express that the dataset will no longer be updated and/or supported. Reach out to dataset authors for concrete details.
* `--no-experimental` — Exclude experimental datasets.

   Authors can mark a dataset as experimental when development of the dataset is still in progress, or if the dataset is incomplete or of lower quality than usual. Use at own risk. Reach out to dataset authors if interested in further development and stabilizing of a particular dataset, and consider contributing.
* `--no-community` — Exclude community datasets and only show official datasets.

   Community datasets are the datasets provided by the members of the broader Nextclade community. These datasets may vary in quality and completeness. Depending on authors' goals, these datasets may be created for specific purposes, rather than for general use. Nextclade team is unable to verify correctness of these datasets and does not provide support for them. For all questions regarding a concrete community dataset, please read its documentation and reach out to its authors.
* `--json` — Print output in JSON format.

   This is useful for automated processing. However, at this time, we cannot guarantee stability of the format. Use at own risk.
* `--only-names` — Print only names of the datasets, without any other details
* `--server <SERVER>` — Use custom dataset server.

   You can host your own dataset server, with one or more datasets, grouped into dataset collections, and use this server to provide datasets to users of Nextclade CLI and Nextclade Web. Refer to Nextclade dataset documentation for more details.

  
* `-x`, `--proxy <PROXY>` — Pass all traffic over proxy server. HTTP, HTTPS, and SOCKS5 proxies are supported
* `--proxy-user <PROXY_USER>` — Username for basic authentication on proxy server, if applicable. Only valid when `--proxy` is also supplied. `--proxy-user` and `--proxy-pass` must be either both specified or both omitted
* `--proxy-pass <PROXY_PASS>` — Password for basic authentication on proxy server, if applicable. Only valid when `--proxy` is also supplied. `--proxy-user` and `--proxy-pass` must be either both specified or both omitted
* `--extra-ca-certs <EXTRA_CA_CERTS>` — Path to extra CA certificates as a PEM bundle.

   You can also provide the path to CA certificates in the environment variable `NEXTCLADE_EXTRA_CA_CERTS`. The argument takes precedence over the environment variable if both are provided.

   Default CA certificates are those obtained from the platform/OS-level trust store plus those from a baked-in copy of Mozilla's common CA trust store. You can override the certs obtained from the platform trust store by setting `SSL_CERT_FILE` or `SSL_CERT_DIR`. Filenames in the latter must be hashed in the style of OpenSSL's `c_rehash` utility.






## `nextclade dataset get`

Download available Nextclade datasets

For short help type: `nextclade -h`, for extended help type: `nextclade --help`. Each subcommand has its own help, for example: `nextclade run --help`.

**Usage:** `nextclade dataset get [OPTIONS] --name <NAME> <--output-dir <OUTPUT_DIR>|--output-zip <OUTPUT_ZIP>>`

###### **Options:**

* `-n`, `--name <NAME>` — Name of the dataset to download. Type `nextclade dataset list` to view available datasets
* `-t`, `--tag <TAG>` — Version tag of the dataset to download.

   If this flag is not provided the latest version is downloaded.
* `--server <SERVER>` — Use custom dataset server.

   You can host your own dataset server, with one or more datasets, grouped into dataset collections, and use this server to provide datasets to users of Nextclade CLI and Nextclade Web. Refer to Nextclade dataset documentation for more details.

  
* `-o`, `--output-dir <OUTPUT_DIR>` — Path to directory to write dataset files to.

   This flag is mutually exclusive with `--output-zip`, and provides the equivalent output, but in the form of a directory with files, instead of a compressed zip archive.

   If the required directory tree does not exist, it will be created.
* `-z`, `--output-zip <OUTPUT_ZIP>` — Path to resulting dataset zip file.

   This flag is mutually exclusive with `--output-dir`, and provides the equivalent output, but in the form of compressed zip archive instead of a directory with files.

   If the required directory tree does not exist, it will be created.
* `-x`, `--proxy <PROXY>` — Pass all traffic over proxy server. HTTP, HTTPS, and SOCKS5 proxies are supported
* `--proxy-user <PROXY_USER>` — Username for basic authentication on proxy server, if applicable. Only valid when `--proxy` is also supplied. `--proxy-user` and `--proxy-pass` must be either both specified or both omitted
* `--proxy-pass <PROXY_PASS>` — Password for basic authentication on proxy server, if applicable. Only valid when `--proxy` is also supplied. `--proxy-user` and `--proxy-pass` must be either both specified or both omitted
* `--extra-ca-certs <EXTRA_CA_CERTS>` — Path to extra CA certificates as a PEM bundle.

   You can also provide the path to CA certificates in the environment variable `NEXTCLADE_EXTRA_CA_CERTS`. The argument takes precedence over the environment variable if both are provided.

   Default CA certificates are those obtained from the platform/OS-level trust store plus those from a baked-in copy of Mozilla's common CA trust store. You can override the certs obtained from the platform trust store by setting `SSL_CERT_FILE` or `SSL_CERT_DIR`. Filenames in the latter must be hashed in the style of OpenSSL's `c_rehash` utility.





## `nextclade sort`

Sort sequences according to the inferred Nextclade dataset (pathogen)

For short help type: `nextclade -h`, for extended help type: `nextclade --help`. Each subcommand has its own help, for example: `nextclade sort --help`.

**Usage:** `nextclade sort [OPTIONS] [INPUT_FASTAS]...`

###### **Arguments:**

* `<INPUT_FASTAS>` — Path to one or multiple FASTA files with input sequences

   Supports the following compression formats: "gz", "bz2", "xz", "zst". If no files provided, the plain fasta input is read from standard input (stdin).

   See: https://en.wikipedia.org/wiki/FASTA_format

###### **Options:**

* `-m`, `--input-minimizer-index-json <INPUT_MINIMIZER_INDEX_JSON>` — Path to input minimizer index JSON file.

   By default, the latest reference minimizer index is fetched from the dataset server (default or customized with `--server` argument). If this argument is provided, the algorithm skips fetching the default index and uses the index provided in the JSON file.

   Supports the following compression formats: "gz", "bz2", "xz", "zst". Use "-" to read uncompressed data from standard input (stdin).
* `-O`, `--output-dir <OUTPUT_DIR>` — Path to output directory

   Sequences will be written in subdirectories: one subdirectory per dataset. Sequences inferred to be belonging to a particular dataset will be placed in the corresponding subdirectory. The subdirectory tree can be nested, depending on how dataset names are organized - dataset names can contain slashes, and they will be treated as path segment delimiters.

   If the required directory tree does not exist, it will be created.

   Mutually exclusive with `--output-path`.
* `-o`, `--output-path <OUTPUT_PATH>` — Template string for the file path to output sorted sequences. A separate file will be generated per dataset.

   The string should contain template variable `{name}`, where the dataset name will be substituted. Note that if the `{name}` variable contains slashes, they will be interpreted as path segments and subdirectories will be created.

   Make sure you properly quote and/or escape the curly braces, so that your shell, programming language or pipeline manager does not attempt to substitute the variables.

   Mutually exclusive with `--output-dir`.

   If the provided file path ends with one of the supported extensions: "gz", "bz2", "xz", "zst", then the file will be written compressed. If the required directory tree does not exist, it will be created.

   Example for bash shell:

   --output='outputs/{name}/sorted.fasta.gz'
* `-r`, `--output-results-tsv <OUTPUT_RESULTS_TSV>` — Path to output results TSV file

   If the provided file path ends with one of the supported extensions: "gz", "bz2", "xz", "zst", then the file will be written compressed. Use "-" to write uncompressed to standard output (stdout). If the required directory tree does not exist, it will be created.
* `--min-score <MIN_SCORE>` — Minimum value of the score being considered for a detection

  Default value: `0.1`
* `--min-hits <MIN_HITS>` — Minimum number of the index hits required for a detection

  Default value: `5`
* `--max-score-gap <MAX_SCORE_GAP>` — Maximum score difference between two adjacent dataset matches, after which the less fitting datasets are not considered.

   This argument will truncate the list of datasets considered for a detection, such that if there is a large enough difference in score ("gap") in the list, all datasets that are worse than the dataset before the gap are removed from consideration. This allows, in situation when there's 2 or more groups of similar datasets, to filter-out the groups that are worse than the best group.

  Default value: `0.2`
* `--all-matches` — Whether to consider all datasets

   By default, only the top matching dataset is considered. When this flag is provided, all datasets reaching the matching criteria are considered.

  Default value: `false`
* `-j`, `--jobs <JOBS>` — Number of processing jobs. If not specified, all available CPU threads will be used
* `--server <SERVER>` — Use custom dataset server.

   You can host your own dataset server, with one or more datasets, grouped into dataset collections, and use this server to provide datasets to users of Nextclade CLI and Nextclade Web. Refer to Nextclade dataset documentation for more details.

  
* `-x`, `--proxy <PROXY>` — Pass all traffic over proxy server. HTTP, HTTPS, and SOCKS5 proxies are supported
* `--proxy-user <PROXY_USER>` — Username for basic authentication on proxy server, if applicable. Only valid when `--proxy` is also supplied. `--proxy-user` and `--proxy-pass` must be either both specified or both omitted
* `--proxy-pass <PROXY_PASS>` — Password for basic authentication on proxy server, if applicable. Only valid when `--proxy` is also supplied. `--proxy-user` and `--proxy-pass` must be either both specified or both omitted
* `--extra-ca-certs <EXTRA_CA_CERTS>` — Path to extra CA certificates as a PEM bundle.

   You can also provide the path to CA certificates in the environment variable `NEXTCLADE_EXTRA_CA_CERTS`. The argument takes precedence over the environment variable if both are provided.

   Default CA certificates are those obtained from the platform/OS-level trust store plus those from a baked-in copy of Mozilla's common CA trust store. You can override the certs obtained from the platform trust store by setting `SSL_CERT_FILE` or `SSL_CERT_DIR`. Filenames in the latter must be hashed in the style of OpenSSL's `c_rehash` utility.



## `nextclade read-annotation`

Read genome annotation and present it in Nextclade's internal formats. This is mostly only useful for Nextclade maintainers and the most curious users. Note that these internal formats have no stability guarantees and can be changed at any time without notice.

For short help type: `nextclade -h`, for extended help type: `nextclade --help`. Each subcommand has its own help, for example: `nextclade sort --help`.

**Usage:** `nextclade read-annotation [OPTIONS] [INPUT_ANNOTATION]`

###### **Arguments:**

* `<INPUT_ANNOTATION>` — Genome annotation file in GFF3 format.

   Learn more about Generic Feature Format Version 3 (GFF3): https://github.com/The-Sequence-Ontology/Specifications/blob/master/gff3.md

###### **Options:**

* `-o`, `--output <OUTPUT>` — Path to output JSON or YAML file.

   The format is chosen based on file extension: ".json" or ".yaml".
* `--feature-tree` — Present features in "feature tree" format. This format is a precursor of genome annotation format - it contains all genetic features, even the ones that Nextclade does not use, but also less information about each feature
* `--json` — Print console output in JSON format, rather than human-readable table



## `nextclade help-markdown`

Print command-line reference documentation in Markdown format

**Usage:** `nextclade help-markdown`



<hr/>

<small><i>
    This document was generated automatically by
    <a href="https://crates.io/crates/clap-markdown"><code>clap-markdown</code></a>.
</i></small>

