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

###### **Options:**


* `-D`, `--input-dataset <INPUT_DATASET>` — Path to a directory or a zip file containing a dataset
* `-d`, `--dataset-name <DATASET_NAME>` — Name of the dataset to download and use during the run
* `-r`, `--input-ref <INPUT_REF>` — Path to a FASTA file containing reference sequence. This file should contain exactly 1 sequence
* `-a`, `--input-tree <INPUT_TREE>` — Path to Auspice JSON v2 file containing reference tree
* `-p`, `--input-pathogen-json <INPUT_PATHOGEN_JSON>` — Path to a JSON file containing configuration and data specific to a pathogen
* `-m`, `--input-annotation <INPUT_ANNOTATION>` — Path to a file containing genome annotation in GFF3 format
* `-g`, `--cds-selection <CDS_SELECTION>` — Comma-separated list of names of coding sequences (CDSes) to use
* `--input-pcr-primers <INPUT_PCR_PRIMERS>` — Path to a CSV file containing a list of custom PCR primer sites. This information is used to report mutations in these sites
* `--server <SERVER>` — Use custom dataset server








* `-O`, `--output-all <OUTPUT_ALL>` — Produce all of the output files into this directory, using default basename and predefined suffixes and extensions. This is equivalent to specifying each of the individual `--output-*` flags. Convenient when you want to receive all or most of output files into the same directory and don't care about their filenames
* `-n`, `--output-basename <OUTPUT_BASENAME>` — Set the base filename to use for output files
* `-s`, `--output-selection <OUTPUT_SELECTION>` — Restricts outputs for `--output-all` flag

  Possible values: `all`, `fasta`, `json`, `ndjson`, `csv`, `tsv`, `tree`, `tree-nwk`, `translations`

* `-o`, `--output-fasta <OUTPUT_FASTA>` — Path to output FASTA file with aligned sequences
* `-P`, `--output-translations <OUTPUT_TRANSLATIONS>` — Template string for path to output fasta files containing translated and aligned peptides. A separate file will be generated for every gene
* `-N`, `--output-ndjson <OUTPUT_NDJSON>` — Path to output Newline-delimited JSON (NDJSON) results file
* `-J`, `--output-json <OUTPUT_JSON>` — Path to output JSON results file
* `-c`, `--output-csv <OUTPUT_CSV>` — Path to output CSV results file (delimiter: semicolon)
* `-t`, `--output-tsv <OUTPUT_TSV>` — Path to output TSV results file (delimiter: tab)
* `-C`, `--output-columns-selection <OUTPUT_COLUMNS_SELECTION>` — Restricts columns written into tabular output files (CSV and TSV)
* `--output-graph <OUTPUT_GRAPH>` — Path to output phylogenetic graph with input sequences placed onto it, in Nextclade graph JSON format
* `-T`, `--output-tree <OUTPUT_TREE>` — Path to output phylogenetic tree with input sequences placed onto it, in Auspice JSON V2 format
* `--output-tree-nwk <OUTPUT_TREE_NWK>` — Path to output phylogenetic tree with input sequences placed onto it, in Newick format (New Hampshire tree format)


* `--include-reference <INCLUDE_REFERENCE>` — Whether to include aligned reference nucleotide sequence into output nucleotide sequence FASTA file and reference peptides into output peptide FASTA files

  Possible values: `true`, `false`

* `--include-nearest-node-info <INCLUDE_NEAREST_NODE_INFO>` — Whether to include the list of nearest nodes to the outputs

  Possible values: `true`, `false`

* `--in-order <IN_ORDER>` — Emit output sequences in-order

  Possible values: `true`, `false`

* `--replace-unknown <REPLACE_UNKNOWN>` — Replace unknown nucleotide characters with 'N'

  Possible values: `true`, `false`

* `--without-greedy-tree-builder <WITHOUT_GREEDY_TREE_BUILDER>` — Disable greedy tree builder algorithm

  Possible values: `true`, `false`

* `--masked-muts-weight <MASKED_MUTS_WEIGHT>`
* `--min-length <MIN_LENGTH>` — Minimum length of nucleotide sequence to consider for alignment
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

* `-n`, `--name <NAME>` — Restrict list to datasets with this *exact* name
* `-s`, `--search <SEARCH>` — Search datasets by name or by reference
* `-t`, `--tag <TAG>` — Restrict list to datasets with this exact version tag
* `--include-incompatible` — Include dataset versions that are incompatible with this version of Nextclade CLI
* `--include-deprecated` — Include deprecated datasets
* `--no-experimental` — Exclude experimental datasets
* `--no-community` — Exclude community datasets and only show official datasets
* `--json` — Print output in JSON format
* `--only-names` — Print only names of the datasets, without any other details
* `--server <SERVER>` — Use custom dataset server
* `-x`, `--proxy <PROXY>` — Pass all traffic over proxy server. HTTP, HTTPS, and SOCKS5 proxies are supported
* `--proxy-user <PROXY_USER>` — Username for basic authentication on proxy server, if applicable. Only valid when `--proxy` is also supplied. `--proxy-user` and `--proxy-pass` must be either both specified or both omitted
* `--proxy-pass <PROXY_PASS>` — Password for basic authentication on proxy server, if applicable. Only valid when `--proxy` is also supplied. `--proxy-user` and `--proxy-pass` must be either both specified or both omitted






## `nextclade dataset get`

Download available Nextclade datasets

For short help type: `nextclade -h`, for extended help type: `nextclade --help`. Each subcommand has its own help, for example: `nextclade run --help`.

**Usage:** `nextclade dataset get [OPTIONS] --name <NAME> <--output-dir <OUTPUT_DIR>|--output-zip <OUTPUT_ZIP>>`

###### **Options:**

* `-n`, `--name <NAME>` — Name of the dataset to download. Type `nextclade dataset list` to view available datasets
* `-t`, `--tag <TAG>` — Version tag of the dataset to download
* `--server <SERVER>` — Use custom dataset server
* `-o`, `--output-dir <OUTPUT_DIR>` — Path to directory to write dataset files to
* `-z`, `--output-zip <OUTPUT_ZIP>` — Path to resulting dataset zip file
* `-x`, `--proxy <PROXY>` — Pass all traffic over proxy server. HTTP, HTTPS, and SOCKS5 proxies are supported
* `--proxy-user <PROXY_USER>` — Username for basic authentication on proxy server, if applicable. Only valid when `--proxy` is also supplied. `--proxy-user` and `--proxy-pass` must be either both specified or both omitted
* `--proxy-pass <PROXY_PASS>` — Password for basic authentication on proxy server, if applicable. Only valid when `--proxy` is also supplied. `--proxy-user` and `--proxy-pass` must be either both specified or both omitted





## `nextclade sort`

Sort sequences according to the inferred Nextclade dataset (pathogen)

For short help type: `nextclade -h`, for extended help type: `nextclade --help`. Each subcommand has its own help, for example: `nextclade sort --help`.

**Usage:** `nextclade sort [OPTIONS] [INPUT_FASTAS]...`

###### **Arguments:**

* `<INPUT_FASTAS>` — Path to one or multiple FASTA files with input sequences

###### **Options:**

* `-m`, `--input-minimizer-index-json <INPUT_MINIMIZER_INDEX_JSON>` — Path to input minimizer index JSON file
* `-O`, `--output-dir <OUTPUT_DIR>` — Path to output directory
* `-o`, `--output-path <OUTPUT_PATH>` — Template string for the file path to output sorted sequences. A separate file will be generated per dataset
* `-r`, `--output-results-tsv <OUTPUT_RESULTS_TSV>` — Path to output results TSV file
* `--min-score <MIN_SCORE>` — Minimum value of the score being considered for a detection

  Default value: `0.1`
* `--min-hits <MIN_HITS>` — Minimum number of the index hits required for a detection

  Default value: `5`
* `--max-score-gap <MAX_SCORE_GAP>` — Maximum score difference between two adjacent dataset matches, after which the less fitting datasets are not considered

  Default value: `0.2`
* `--all-matches` — Whether to consider all datasets

  Default value: `false`
* `-j`, `--jobs <JOBS>` — Number of processing jobs. If not specified, all available CPU threads will be used
* `--server <SERVER>` — Use custom dataset server
* `-x`, `--proxy <PROXY>` — Pass all traffic over proxy server. HTTP, HTTPS, and SOCKS5 proxies are supported
* `--proxy-user <PROXY_USER>` — Username for basic authentication on proxy server, if applicable. Only valid when `--proxy` is also supplied. `--proxy-user` and `--proxy-pass` must be either both specified or both omitted
* `--proxy-pass <PROXY_PASS>` — Password for basic authentication on proxy server, if applicable. Only valid when `--proxy` is also supplied. `--proxy-user` and `--proxy-pass` must be either both specified or both omitted



## `nextclade read-annotation`

Read genome annotation and present it in Nextclade's internal formats. This is mostly only useful for Nextclade maintainers and the most curious users. Note that these internal formats have no stability guarantees and can be changed at any time without notice.

For short help type: `nextclade -h`, for extended help type: `nextclade --help`. Each subcommand has its own help, for example: `nextclade sort --help`.

**Usage:** `nextclade read-annotation [OPTIONS] [INPUT_ANNOTATION]`

###### **Arguments:**

* `<INPUT_ANNOTATION>` — Genome annotation file in GFF3 format

###### **Options:**

* `-o`, `--output <OUTPUT>` — Path to output JSON or YAML file
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

