## Upcoming

### Attach sequences to a priori most likely node if reference tree contains "placement_prior"

Until now, when there were multiple positions with equal numbers of mismatches between a query sequence and reference tree position, Nextclade always attached the query sequence to the reference tree node with the fewest number of ancestors. Due to the way recombinants are placed in the SARS-CoV-2 reference trees, this meant that in particular partial sequences were often attached to recombinants. With most recombinants being rare, this bias to attach to recombinants was often surprising.

In this version, we introduce a new [feature](https://github.com/nextstrain/nextclade/pull/1119) that allows to attach sequences to a priori most likely nodes - taking into account which positions on the reference tree are most commonly found in circulation. The information on the prior probability that a particular reference tree node is the best match for a random query sequence is contained in the `placement_prior` reference tree node attribute. This attribute is currently only present in the most recent SARS-CoV-2 reference trees. The calculation can be found in this `nextclade_data_workflows` [pull request](https://github.com/neherlab/nextclade_data_workflows/pull/38).

To given an example: a partial sequence may have as many mismatches when compared to BA.5 as it has to the recombinant XP. Based on sequences in public databases, we know that BA.5 is much more common than XP. Hence, the query sequence is attached to BA.5. Previously, the query sequence would have been attached to XP, because XP has fewer parent nodes in the reference tree.

The impact of the feature is biggest for partial and incomplete sequences.

### Add custom phenotype values to the newly placed tree nodes

The phenotype values (such as `ace2_binding` and `"immune_escape"`) are present in all output files, but are missing from the tree JSON, due to an omission. This is no fixed and these values are set as node attributes of the tree. This allows to see the values and colorings for phenotype values on the tree page.

### Fix length of 3' unsequenced aminoacid ranges in Nextclade Web

Nextclade Web was showing right boundary of the unsequenced AA range on the 3' end of peptide sequences incorrectly (the range was longer than expected). The calculations were using length of a gene in nuc;eotides, where there should be length in codons. This is now fixed.

### Fix incorrect indices in mutation badges 

The mutation badges in various places in Nextclade Web could show position "0", even though they are supposed to be 1-based. This was due to a programming mistake, which is now corrected.

### Fix Google Search Console warnings

We resolved warnings in Google Search Console: added canonical URL meta tag, and added `noindex` tag for non-release deployments. This should improve Nextclade appearance in Google Search.


## Nextclade Web 2.12.0, Nextclade CLI 2.12.0 (2023-02-28)

### Improve tooltip for "missing" column in Nextclade Web

This column's tooltip now also shows ranges of unsequenced regions, i.e. contiguous ranges of nucleotide characters absent at the 5' and 3' end of the original query sequence, as compared to the reference sequence. To put it differently, these are the ranges that are to the left and right of the alignment range - from 0 to `alignmentStart` and from `alignmentEnd` to the length of the reference sequence. These regions may appear after alignment step, where Nextclade or Nextalign might insert characters `-` on the 5' and 3' ends to fill the query sequence to the length of the reference sequence. Just like it does with the characters that are absent from the inner parts of the query sequence (which we then call "deletions"). If found, the unsequenced regions are also shown as two light-grey rectangles at either or both ends of the sequence in sequence view column in Nextclade Web.

Unsequenced regions are not to be confused with the missing nucleotides, which are also shown in the same tooltip. Missing nucleotides are the `N` characters present in the original query sequence. They are not introduced nor modified by Nextclade and Nextalign, and are only detected and counted.

It seems that there is no consensus in the bioinformatics community about the notation and naming of either of these events (e.g. which character to use and how to call these ranges). Be thoughtful about these regions when working with the results of Nextclade and Nextalign, especially if you analyze:

 - sequences from different sources (different labs may use different conventions)
 - sequences that are partial (have large unsequenced ranges on 5' and 3' end and large deletions in the body)
 - sequences of low quality (e.g. lots of `N`s and large deletions in the body)
 - sequences that are already aligned (e.g. have some form of padding on 5' and 3' ends)
 - sequences that are processed in some way (e.g. replacement or filling with `N` or `-`, or even filling from a consensus genome)

If you find strange or inconsistent results, we encourage you to inspect the input and output sequences in an alignment viewer on per-sequence basis and to contact the authors of individual sequences to clarify their conventions and intent.

### Fix alignment range in CSV and TSV outputs

In CSV and TSV outputs, the values in columns `alignmentStart` and `alignmentEnd` were emitted in 0-based numbering. This was unexpected - by convention, CSV and TSV files have all ranges in 1-based format. This is now fixed.

### Add new columns in CSV and TSV outputs

We added new columns in CSV and TSV outputs:

 - `unknownAaRanges` - list of detected contiguous ranges of unknown aminoacid (character `X`)
 - `totalUnknownAa` - total number of unknown aminoacids (character `X`)

### Internal changes

 - Upgrade Auspice to 2.43.0 ([changelog](https://github.com/nextstrain/auspice/blob/master/CHANGELOG.md))
 - Upgrade Rust to 1.67.1 ([changelog](https://github.com/rust-lang/rust/blob/master/RELEASES.md))


## Nextclade Web 2.11.0, Nextclade CLI 2.11.0 (2023-01-31)

### IMPORTANT: ensure `index` column is written to CSV/TSV output files in case of error

The new column `index` was correctly written when analysis of a sample succeeds. However, for analyses which ended up with an error (e.g. "Unable to align") this column was mistakenly missing. In this version we fix this omission.

### Fix gene map width in Nextclade Web

Gene map (genome annotation) was misaligned with sequence views (not matching their width). This has been fixed in this version.

### Add table row indices to results table in Nextclade Web

We added a column with index of the row in the table. This is useful for visual search and counting of sorted and filtered results.

Not to be confused with sequence index. Row indices always start with 0 and sorted in ascending order, and do not change their position when sorting or filtering the results.

These indices are not a part of output files. Nextclade CLI is not affected.

### Improve error messages

Errors due to failure of sequence alignment are reworded and hopefully are more complete and comprehensible now.
Additionally, we improved error message when reference sequence fails to read.

### Always show action buttons on results page in Nextclade Web

On smaller screens the "Download", "Tree" and other action buttons were not visible by default and horizontal scrolling were required to see them. We changed the layout such that the panel with buttons does not overflow along with table and so the buttons are always visible. Table is still scrollable.

### Improve wording on main page of Nextclade Web

We improved text on main page as well as descriptions inside HTML markup, adding more concrete information and keywords. This should be more pleasant to read and might improve Nextclade ranking in search engines.


## Nextclade CLI 2.10.1 (2023-01-24)

### Ensure `--output-all`, `--output-tsv`, `--output-csv` can be used together again in Nextclade CLI

This fixes a regression introduced in Nextclade CLI 2.10.0, where `--output-all`, `--output-tsv`, `--output-csv` arguments became mutually exclusive. This was not intended and now resolved.

This bug was breaking out bioconda checks, so Nextclade CLI version 2.10.0 will not be available in bioconda. Use 2.10.1 instead.

Nextclade Web is not affected.


## Nextclade Web 2.10.0, Nextclade CLI 2.10.0 (2023-01-24)

### Add motifs search

Nextclade datasets can now be configured to search for motifs in the translated sequences, given a regular expression.

At the same time, we released new versions of the following Influenza datasets, which use this feature to detect glycosylation motifs:

 - Influenza A H1N1pdm HA (flu_h1n1pdm_ha), with reference MW626062
 - Influenza A H3N2 HA (flu_h3n2_ha), with reference EPI1857216

If you run the analysis with the latest version of these datasets, you can find the results in the `glycosylaiton` column or field of output files or in "Glyc." column in Nextclade Web.

If you want to configure your own datasets for motifs search, see an example configuration in the `aaMotifs` property of `virus_properties.json` of these datasets: [link](https://github.com/nextstrain/nextclade_data/blob/bc2974ab3bf5a9198e68f5f54db095dc3d6e968b/data/datasets/flu_h3n2_ha/references/EPI1857216/versions/2023-01-19T12%3A00%3A00Z/files/virus_properties.json#L35-L55).


### Allow to chose columns written into CSV and TSV outputs

You can now select a subset of columns to be included into CSV and TSV output files of Nextclade Web (available in the "Download" dialog) and Nextclade CLI (available with `--output-csv` and `--output-tsv`). You can either chose individual columns or categories of related columns.

In Nextclade Web, in the "Download" dialog, click "Configure columns", then check or uncheck columns or categories you want to keep. Note that this configuration persists across different Nextclade runs.

In Nextclade CLI, use `--output-columns-selection` flag. This flag accepts a comma-separated list of column names and/or column category names. Individual columns and categories can be mixed together. You can find a list of column names in the full output file. The following categories are currently available: all, general, ref-muts, priv-muts, errs-warns, qc, primers, dynamic. Another way to receive both lists is to add a non-existent or misspelled name to the list. The error message will then display all possible columns and categories.

Note that because of this feature the order of columns might be different compared to previous versions of Nextclade.


### Add URL parameter for running analysis of example sequences

You can now launch the analysis of example sequences (as provided by the dataset) in Nextclade Web, by using the special keyword `example` in the `input-fasta` URL parameter. For example, navigating to this URL will run the analysis of example SARS-CoV-2 sequences (same as choosing "SARS-CoV-2" and then clicking "Load example" in the UI):

```
https://clades.nextstrain.org/?dataset-name=sars-cov-2&input-fasta=example
```

This could useful for example for testing new datasets:

```
https://clades.nextstrain.org/?dataset-url=http://example.com/my-dataset-dir&input-fasta=example
```

### Add `index` column to CSV and TSV outputs

The `index` field is already present in other output formats. In this version CSV and TSV output files gain `index` column as well, which contains the index (integer signifying location) of a corresponding record in the input fasta file or files. Note that this is not the same as row index, because CSV/TSV rows can be emitted in an unspecified order in Nextclade CLI (but this can be changed with `--in-order` flag; which is set by default in Nextclade Web).

Note that sequence names (`seqName` column) are not guaranteed to be unique (and in practice are not unique very often). So indices is the only way to reliably link together inputs and outputs.


## Nextclade Web 2.9.1, Nextclade CLI 2.9.1 (2022-12-09)

### Set default weights in "private mutations" QC check to 1

This fixes the bug when the QC score is 0 (good) when the following QC fields are missing from `qc.json`:

```
.privateMutations.weightLabeledSubstitutions
.privateMutations.weightReversionSubstitutions
.privateMutations.weightUnlabeledSubstitutions
```

In this case Nextclade assumed value of 0, which lead to QC score of 0 always. Not all datasets were adjusted for the new `qc.json` format in time and some had these fields missing - notably the flu datasets. So these datasets were erroneously showing perfect QC score for the "private mutations" rule. 

In this version we set these weights to 1.0 if they are missing, which fixes the incorrect QC scores. Some of the sequences will now correctly show worse QC scores.


### Fix dataset selector in Nextclade Web when there are datasets with the same name, but different reference sequences

The dataset selector on the main page on nextclade Web did not allow selecting datasets with the same name, but different reference sequences. This did not affect users so far, but we are about to release new Influenza datasets, which were affected. In this version we resolve the problem by keeping track of datasets not just by name, but by a combination of all attribute values (the `.attributes[]` entries in the datasets index JSON file).


### Ensure non-default references in "dataset list" command of Nextclade CLI are shown

This introduces special value `all` for `--reference` argument of `nextclade dataset list` command. And it is now set as default. When it's in force, datasets with all reference sequences are included into the displayed list. This resolves the problem where non-default references are not show in the list.


### Internal changes

 - We are now submitting PRs to bioconda automatically, which should reduce the delay of updates there


## Nextclade Web 2.9.0, Nextclade CLI 2.9.0 (2022-12-06)

### Increase requirements for supported Linux distributions for GNU flavor of Nextclade CLI

Due to malfunction of package repositories of Debian 7, we had to switch automated builds of the "gnu" flavor of Nextclade CLI from Debian 7 to CentOS 7. This increases minimum required version of glibc to 2.17. The list or Linux distributions we tested the new version of Nextclade on is [here](https://github.com/nextstrain/nextclade/blob/9f2b9a620a7bc9a068909634a4fc3f29757c059f/tests/test-linux-distros#L18-L62). For users of older Linux distributions (with glibc < 2.17) we suggest to use "musl" flavor of Nextclade CLI, which does not depend on glibc, but might be substantially slower. Users of Nextclade CLI on macOS and Windows and users of Nextclade Web are not affected.

### Add gene length validation in GFF3 parser

Nextclade will now check if genes have length divisible by 3 in gene maps and will fail with an error if it's not the case.

### Fix translated (internationalized) strings in Nextclade Web

We fixed missing spaces between words in some of the languages and fixes some of the translations.

### Internal changes

 - build Linux binaries on CentOS 7
 - migrate CI to GitHub Actions
 - upgrade Rust to 1.65.0


## Nextclade Web 2.8.1 (2022-11-01)

### Fix translated (internationalized) text on Tree page

We fixed some of the text labels on Tree page in Nextclade Web. Additionally, the page is now translated to more languages.


### Hotlink clade schema

The Nextstrain clade schema for SARS-CoV-2 on main page is now taken directly from [ncov-clades-schema](https://github.com/nextstrain/ncov-clades-schema) project and is updated automatically whenever the source updates.


## Nextclade Web 2.8.0, Nextclade CLI 2.8.0 (2022-10-20)

### Community datasets in Nextclade Web

This release adds support for fetching custom datasets from a remote location. This can be used for testing datasets introducing support for new pathogens, as well as for sharing these datasets with the community.

For that, we added the `dataset-url` URL query parameter, where you can specify either a direct URL to the directory of your custom dataset:

```
https://clades.nextstrain.org?dataset-url=http://example.com/path/to/dataset-dir
```

or a URL to a GitHub repository:

```
https://clades.nextstrain.org?dataset-url=https://github.com/my-name/my-repo/tree/my-branch/path/to/dataset-dir
```

or a special shortcut to a GitHub repository:

```
https://clades.nextstrain.org?dataset-url=github:my-name/my-repo@my-branch@/path/to/dataset-dir
```

If a branch name is not specified, the default branch name is queried from GitHub. If a path is omitted, then the files are fetched from the root of the repository.

When `dataset-url` parameter is specified, instead of loading a list of default datasets, a single custom dataset is loaded from the provided address. Note that this should be publicly accessible and have [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) enabled. GitHub public repositories already comply with these requirements, so if you are using a GitHub URL or a shortcut, then no additional action is needed.

For more information, refer to:
 - PR [#1026](https://github.com/nextstrain/nextclade/pull/1026) 
 - [Nextclade documentation on datasets](https://docs.nextstrain.org/projects/nextclade/en/stable/user/datasets.html)
 - [Nextclade data repo](https://github.com/nextstrain/nextclade_data)
 - [Nextclade developers guide](https://github.com/nextstrain/nextclade/blob/f4f54c0fd7273c7fd4bfc55b9f6140490c20ddc9/docs/dev/developer-guide.md#trying-custom-datasets-locally)

### Compression of all input and output files in Nextclade CLI and Nextalign CLI

Previously, only FASTA files could be compressed and decompressed on the fly. Now Nextclade CLI and Nextalign CLI can read all input and write all output files in compressed formats. Simply add one of the supported file extensions: "gz", "bz2", "xz", "zstd", and the files will be compressed or decompressed transparently.


### Decrease default number of threads in Nextclade Web

Some users have observed long startup times of the analysis in Nextclade Web. In this release we decreased the default number of processing threads from 8 to 3, such that startup time is now a little faster.

If you want to speedup the analysis of large batches of sequences, at the expense of longer startup time, you can tune the number of threads in the "Settings" dialog.


### Improve readability of text fragments in Nextclade Web

We've made text paragraphs on main page and some other places a little prettier and hopefully more readable.


### Fix crash when reading large, highly-nested tree files

We improved handling of Auspice JSON format, such that it no longer crashes when large trees and trees with large number of deep branches are provided.


## Nextclade Web 2.7.1 (2022-10-06)

### Update clade schema

We updated [SARS-CoV-2 clade schema](https://github.com/nextstrain/ncov-clades-schema) on main page. 

### Upgrade Auspice

We upgraded Auspice tree view to version [2.39.0](https://github.com/nextstrain/auspice/releases/tag/v2.39.0)


## Nextclade CLI 2.7.0, Nextclade Web 2.7.0 (2022-10-05)

### Hide custom clade columns

We added ability to mark certain custom clade columns as hidden. In this case they are not shown in Nextclade Web. This prepares the web application for the upcoming reorganization of clade columns. It should not affect current users.

### Remove unused fields from output files, add custom phenotype key list

We removed extra repetitive fields related to custom phenotype columns (e.g. "Immune escape" and "ACE-2 binding") entries from JSON and NDJSON output files. We also added keys for custom phenotype columns to the header section of output JSON, for symmetry with custom clade columns. These changes should not affect most users.


## Nextclade Web 2.6.1 (2022-09-28)

### Prettier tooltips

Improved help text formatting in the new "Immune escape" and "ACE-2 binding" columns (available for "SARS-CoV-2 relative to BA.2"), for better readability.

### Correct links to datasets changelog

The links to datasets changes now correctly point to the page on release branch of the dataset GitHub repo, as opposed to the development branch.


## Nextclade Web 2.6.0, Nextclade CLI 2.6.0 (2022-09-27)

### New metrics: Immune escape and ACE-2 binding

We added software support for the new custom metrics in Nextclade CLI and nextclade Web. The dataset "sars-cov-2-21L" with the data required for these metrics to appear will be released in the coming days. Stay tuned.

### The `dataset-name` URL parameter is now properly applied in Nextclade Web, even when `input-fasta` is not provided

Previously `dataset-name` URL parameter was ignored, unless `input-fasta` is also set. Now the `dataset-name` will make Nextclade Web to preselect the requested dataset, regardless of whether the `input-fasta` URL parameter is also provided. This allows to create URLs which preconfigure Nextclade Web with a certain dataset and dataset customizations, with intent to provide fasta and to run manually.

### Better error handling

We improved error handling, such that some of the errors in Nextclade Web now have better error messages. Some of the errors that previously caused hard crash in in Nextclade CLI are now handled more gracefully and with better error messages.

### Internal changes

We upgraded Rust to 1.63.0 and Nextclade CLI and Nextalign CLI are now using `std::thread::scope` for better multithreading support.


## Nextclade Web 2.5.1 (2022-09-20)

### Ensure files with non-UTF-8 encoding are accepted

Previously, input files with encodings other than UTF-8 were causing a crash in Nextclade Web. Now Nextclade tries to detect encoding and process the files. Error messages and error dialogs were improved.

### Improve user interface internationalization

We translated user interface of Nextclade Web to more languages, and translated some of the previously untranslated elements for existing languages. The language can be selected using a dropdown on the top panel.

### Upgrade Auspice to 2.38.0

Auspice tree view was updated to the latest version.


## Nextclade CLI 2.5.0, Nextclade Web 2.5.0 (2022-08-31)

### **Feature (CLI, Web)**: Coverage analysis

Nextclade now emits "coverage" metric which shows the portion of nucleotides in the alignment range being non-N and non-ambiguous, compared to the length of the reference sequence:

```
coverage = ((alignment_end - alignment_start) - total_missing - total_non_acgtns) / ref_len;
```

The metric is displayed as a percentage in the "Cov." column of Nextclade Web, and emitted into JSON, NDJSON, CSV and TSV outputs of Nextclade CLI and Web in the "coverage" field or column.

### **Feature (Web)**: Display machine-readable dataset names

Dataset selector on the main page of Nextclade Web now additionally shows machine-readable dataset name. This can help advanced Web users to put correct dataset name into the URL parameters, and CLI users to find the correct dataset name for downloads.

### **Feat (Web)**: Compact results table

We made some of the columns in results table of Nextclade Web narowwer to make user experience a little better on laptops. When possible, for optimal experience, we still recommend to use 1080p displays or larger.

### **Fix (Web)**: Crashes when using filtering panel

Users reported intermittent crashes of Nextclade Web when entering values in the filtering panel on results page of Nextclade Web. This have been fixed now. If you stil have problems, please submit an issue in our GitHub repository.


## Nextclade Web 2.4.2 (2022-08-27)

### **Fix (Web)**: download links on main page

Dowmload links on main page have been fixed.

### **Fix (Web)**: "About" text on main page

Text on main page have been updated according to the current knowledge.


## Nextclade Web 2.4.1 (2022-08-02)

### **Fix (Web)**: reset detected sequence name duplicate when starting new run

Nextclade Web 2.4.0 was incorrectly retaining sequence name duplicates info across runs. This is now fixed.


## Nextclade CLI 2.4.0, Nextclade Web 2.4.0 (2022-08-02)

### **Fix (Web)**: use indices to identify sequences uniquely in Nextclade Web

Previously, Nextclade used sequence names to identify sequences. However, sequence names proven to be unreliable - they are often duplicated. This caused various problems where results with the same names could have been overwritten.

Since this version, Nextclade Web is using sequence indices (order of sequences in the input file or files), to tell the sequences apart, uniquely. This should ensure correct handling of duplicate names. This change only affects results table in the Web application. CLI is not affected.


### **Feature (Web)**: warn about duplicate sequence names

Nextclade Web now reports duplicate sequence names. Duplicate sequence names often confuse bioinformatics tools, databases and bioinformaticians themselves, so we are trying to encourage the community to be more thoughtful about naming of their samples.

When duplicate names are detected during analysis in Nextclade Web, the "Sequence name" column of the results table now displays a yellow "duplicates" warning icon, and its tooltip contains a list of indices of sequences (serial numbers of the sequences in the input fasta file or files) having the same name.

Note that Nextclade compares only names, not sequence data themselves.


### **Feature (CLI)**: add "download dataset and run" shortcut"

In this version we added `--dataset-name` (`-d`) argument to `run` command, which allows to download a dataset with default parameters and run with it immediately, all in one command.

For example this command.

```bash
nextclade run --output-all=out --dataset-name=sars-cov-2 sequences.fasta
```
or, the same, but shorter

```bash
nextclade run -O out -d sars-cov-2 sequences.fasta
```

will download the latest default SARS-CoV-2 dataset into memory and will run analysis with these dataset files. This is a convenience shortcut for the usual combination of `nextclade dataset get` + `nextclade run`. The dataset is not persisted on disk and downloaded on every run.


### **Feature (CLI)**: Upgrade Auspice from version 2.37.2 to 2.37.3

This release includes a routine upgrade of Auspice tree view. You can read the [changelog in the Auspice GitHub repository](https://github.com/nextstrain/auspice/releases/tag/v2.37.3)


## Nextclade CLI 2.3.1, Nextclade Web 2.3.1

- **Fix** [#947](https://github.com/nextstrain/nextclade/pull/947): In datasets where genes started right at the beginning of the reference sequence, Nextclade version 2.0.0 until 2.3.0 will crash due to underflow. This is now fixed. The only Nextclade provided dataset that was affected by this bug is Influenza Yamagate HA. That dataset had a further bug in the tree so there is now a corresponding dataset bug fix release available. (report: @mcroxen)

## Nextclade CLI 2.3.0, Nextclade Web 2.3.0


This release brings back entries for failed sequences into output files.

It was reported by @tseemann that in Nextclade v2 CSV and TSV rows are not written for failed sequences. While in v1 they were. This was unintended.

In this release:

 - CSV, TSV, NDJSON rows for failed entries are now also written (only `seqName` and `errors` columns are populated). Note, it's important to check for `errors` column and disregard other columns if there are errors. For example, in case of an error, the `substitutions` column will be empty, but it does not mean that the failed sequence has no substitutions.
 - JSON output now has a separate `errors` field at the root of the object, with all failed entries
 - NDJSON rows are also written for failed entries. They only contain index, seqName and errors fields.
 - new columns are written into CSV and TSV outputs: warnings and failedGenes, which include any warnings emitted for a sequence as well as a list of genes that failed translation. Now all columns of the "errors.csv" file are also in the CSV and TSV results files



## Nextclade CLI 2.2.0

- **Feature** When `--retry-reverse-complement` argument is used, and reverse complement transform is applied to a sequence, only the fasta header in the nucleotide alignment is changed by addition of ` |(reverse complement)` to the sequence name, not in all output files. Other output files signal this transformation with a boolean property or a column `isReverseComplement`.

## Nextclade CLI 2.1.0

- **Fix** [#907](https://github.com/nextstrain/nextclade/issues/907): If `--ouput-basename` contains dots, the last component is no longer omitted (report: @KatSteinke, fix: @ivan-aksamentov)

- **Fix** [#908](https://github.com/nextstrain/nextclade/issues/908): Files passed as `--input-virus-properties` were interpreted like passed to `--input-pcr-primers` and vice versa (report: @BCArg, fix: @CorneliusRoemer)


## Nextclade Web 2.2.0

- **Feature**: Display lineage in the info boxes on the Tree page

- **Fix**: Add missing QC status in the info boxes on the Tree page

- **Fix**: Prevent excessive memory consumption by leveraging "Min match rate" alignment parameter (see changes in version 2.0.0)
  
- **Fix**: Prevent crash when using certain filter queries on Results page


## Nextclade Web 2.1.0

- **Feature**: Display a warning when unsupported browser is used
  
- **Fix**: Display correct favicon


## Nextclade 2.0.0

### Rust

Nextclade core algorithms and command-line interface was reimplemented in Rust (replacing C++ implementation).

[Rust is a modern, high performance programming language](https://www.rust-lang.org/) that is pleasant to read and write. Rust programs have comparable runtime performance with C++, while easier to write. It should provide a serious productivity boost for the dev team.

Also, it is now much simpler to contribute to Nextclade. If you wanted to contribute, or to simply review and understand the codebase, but were scared off by the complexity of C++, then give it another try - the Rust version is much more enjoyable! Check our [developer guide](https://github.com/nextstrain/nextclade/blob/master/docs/dev/developer-guide.md) for getting started. We are always open for contributions, reviews and ideas!


### Alignment algorithm rewritten with adaptive bands

- **Feature**: Previously, the alignment band width was constant throughout a given sequence. Now, band width is adaptive: narrow where seed matches indicate no indels, wide where seed matches indicate indels.

- **Performance** is improved for sequences with indels

- **Fix**: Terminal alignment errors, particularly common in BA.2, are fixed due to wider default band width between terminal seed matches and sequence ends

- **Fix**: More robust seed matching allows some previously unalignable sequences to be aligned

- **Fix**: Terminal indels for amino acid alignments are only free if the nucleotide alignment indicates a gap. Otherwise, they are penalized like internal gaps. This leads to more parsimonious alignment results.
  
- **Feature**: Additional alignment parameters can now be tuned:

   - "Excess band width" parameter controls the extra band width that is necessary for correct alignment if both deletions and insertions occur between two seed matches.

   - "Terminal band width" controls the extra band width that is necessary for correct alignment if terminal indels occur.

- **Feature**: "Min match rate" parameter is added, which sets required rage of seed matches in a sequence (number of matched seeds divided by total number of attempted seeds). If the measured rate is below required, alignment will not be attempted, as for such sequences, there is a high chance of infeasible memory and computational requirements. The default value is 0.3.

- **Fix**: 3' terminal insertions are now properly detected

- **Feature**: "Retry reverse complement" alignment parameter is added. When enabled, an additional attempt of seed matching is made after initial attempt fails. The second attempt is performed on reverse-complemented sequence.

  As a consequence:
   - the output alignment, peptides and analysis results correspond to this modified sequence and not to the original
   - sequence name gets a suffix appended to it for all output files (fasta, seqName column, node name on the tree etc.)
   - in output files, there is a new field/column: `isReverseComplement`, which contains `true` if the corresponding sequence underwent reverse-complement transformation

  This functionality is opt-in and the default behavior is unchanged: skip sequence and emit a warning.

### Genes on reverse (negative) strand

Nextclade now correctly handles genes on reverse (negative) strand, which is particularly important for Monkeypox virus.


### Nextclade Web

 - **Feature**: Nextclade Web is now substantially faster, both to startup and when analysing sequences, due to general algorithmic improvements.

 - **Feature**: Drag&drop box for fasta files now supports multiple files. The files are concatenated in this case.

 - **Feature**: Sequence view and peptide views now show insertions. They are denoted as purple triangles.

 - **Fix**: Tree view now longer shows duplicate clade annotations


### Input files

 - **Fix**: gene map GFF3 file now correctly accepts "gene" and "locus_tag" attributes. This should allow to use genome annotations from GeneBank with little or no modifications.

 - **Feature**: Nextclade now reads virus-specific alignment parameters from `virus_properties.json` file from the dataset. It is equivalent to passing alignment tweaks using command-line flags, but is more convenient. If a  parameter is provided in both `virus_properties.json` and as a flag, then the flag takes precedence.


### Nextclade CLI

 - **Feature**: **BREAKING CHANGE** Command-line interface was redesigned to make it more consistent and ergonomic. The following invocation should be sufficient for most users:
 
   ```bash
   nextclade run --input-dataset=dataset/ --output-all=out/ sequences.fasta
   ```

   short version:

   ```bash
   nextclade run -D dataset/  -O out/ sequences.fasta
   ```

   - Nextalign CLI and Nextclade CLI now require a command as the first argument. To reproduce the behavior of Nextclade v1, use `nextalign run` instead of `nextalign` and `nextclade run` instead of `nextclade`. See `nextalign --help` or `nextclade --help` for the full list of commands. Each command has it own `--help` menu, e.g. `nextclade run --help`.

   - `--input-fasta` flag is removed in favor of providing input sequence file names as positional arguments. Multiple input fasta files can be provided. Different compression formats are allowed:

     ```bash
     nextclade run -D dataset/ -O out/ 1.fasta 2.fasta.gz 3.fasta.xz 4.fasta.bz2 5.fasta.zst
     ```

   - If no fasta files provided, it will be read from standard input (stdin). Reading from stdin does not support compression.

   - If a special filename (`-`) is provided for one of the individual output file flags (`--output-*`), the corresponded output will be printed to standard output (stdout). This allows integration into Unix-style pipelines. For example:

     ```bash
     curl $fasta_gz_url | gzip -cd | nextclade run -D dataset/ --output-tsv=- | my_nextclade_tsv_processor
     
     xzcat *.fasta.xz | nextalign run -r ref.fasta -m genemap.gff -o - | process_aligned_fasta
     ```

   - The flag `--output-all` (`-O`) replaces `--output-dir` flag and allows to conveniently output all files with a single flag.

   - The new flag `--output-selection` allows to restrict what's being output by the `--output-all` flag.

   - If the `--output-basename` flag is not provided, the base name of output files will default to "nextclade" or "nextalign" respectively for Nextclade CLI and Nextalign CLI. They will no longer attempt to guess base file name from the input fasta.

   - The new flag `--output-translations` is a dedicated flag to provide a file path template which will be used to output translated gene fasta files. This flag accepts a template string with a template variable `{gene}`, which will be substituted with a gene name. Each gene therefore receives it's own path. Additionally, the translations are now independent from output directory and can be omitted if they are not necessary.

   Example: 
 
    If the following is provided:

    ```bash
    --output-translations='output_dir/gene_{gene}.translation.fasta'
    ```

    then for SARS-CoV-2 Nextclade will write the following files:
   
    ```
    output_dir/gene_ORF1a.translation.fasta
    output_dir/gene_ORF1b.translation.fasta
    ...
    output_dir/gene_S.translation.fasta
    ```

   Make sure you properly quote and/or escape the curly braces in the variable `{gene}`, so that your shell, programming language or pipeline manager does not attempt to substitute the variable.



 - **Feature**: New `--excess-bandwidth`, `--terminal-bandwidth`, `--min-match-rate`, `--retry-reverse-complement` arguments are added (see "Alignment algorithm rewritten with adaptive bands" section for details)



 - **Feature**: Nextclade CLI and Nextalign CLI now accept compressed input files. If a compressed fasta file is provided, it will be transparently decompressed. Supported compression formats: `gz`, `bz2`, `xz`, `zstd`. Decompressor is chosen based on file extension.

 - **Feature**: Nextclade CLI and Nextalign CLI can now write compressed output files. If output path contains one of the supported file extensions, it will be transparently compressed. Supported compression formats: `gz`, `bz2`, `xz`, `zstd`.

 - **Feature**: Nextclade can now write outputs in newline-delimited JSON format . Use `--output-ndjson` flag for that. NDJSON output is equivalent to JSON output, but is not hierarchical, so it can be easily streamed and parsed one entry at a time.

 - **Feature**: Nextclade `dataset get` and `dataset list` commands now can fetch dataset index from a custom server. The root URL of the dataset server can be set using `--server=<URL>` flag.

 - **Feature**: Nextclade `dataset get` command can output downloaded dataset in the form of a zip archive, using `--output-zip` flag. The dataset zip is simply the dataset directory, but compressed, and it can be used as a replacement in the `--input-dataset` flag of the `run` command.

 - **Feature**: Nextalign CLI and Nextclade CLI provide a command for generating shell completions: see `nextclade completions --help` for details.

 - **Feature**: Verbosity of can be tuned using wither `--verbosity=<severity>` flag or one or multiple occurences of `-v` and `-q` flags. By default Nextclade and Nextalign show messages with severity "warn" or above (i.e. only warning and errors). Flag `-v` increases and flag `-q` decreases verbosity one step, `-vv` and `-qq` - two steps, etc.


### Feedback

If you found a bug or have a suggestion, feel free to:

 - submit a new issue on GitHub: [nextstrain/nextclade](https://github.com/nextstrain/nextclade/issues)
 - [fork](https://docs.github.com/en/get-started/quickstart/fork-a-repo) the Nextclade GitHub repository [nextstrain/nextclade](https://github.com/nextstrain/nextclade) and contribute a bugfix or an improvement (see [dev guide](https://github.com/nextstrain/nextclade/blob/master/docs/dev/developer-guide.md))
 - join Nextstrain discussion forum: [discussion.nextstrain.org](https://discussion.nextstrain.org) for a free-form discussion

We hope you enjoy using Nextclade 2.0.0 as much as we enjoyed building it!


## Nextclade Web 1.14.1

### [Feature] Updated clade schema

In this version we updated clade schema on main page according to new clade definitions.


## Nextclade Web 1.14.0, Nextclade CLI 1.11.0, Nextalign CLI 1.11.0 (2022-03-15)

### [Feature] Nextclade Pango classifier (SARS-CoV-2 specific)

With the latest dataset, Nextclade now assigns sequences a pango lineage, similar to how clades are assigned. The classifier is about 98% accurate for sequences from the past 12 months. Older lineages are deprioritised, and accuracy is thus worse. Read more about the method and validation against pangoLEARN and UShER in this report: [Nextclade as pango lineage classifier: Methods and Validation](https://docs.nextstrain.org/projects/nextclade/en/latest/user/algorithm/nextclade-pango.html).

### [Feature] Better tree extensions [#741](https://github.com/nextstrain/nextclade/pull/741)

The Nextclade extensions fields in reference tree JSON now contain more information. This makes custom clade-like columns on the results page more informative.

### [Feature] Update Auspice

The tree rendering component, [Auspice](https://docs.nextstrain.org/projects/auspice/en/stable/index.html), was updated to version 2.34.1. Refer to [its changelog](https://github.com/nextstrain/auspice/blob/master/CHANGELOG.md) for details.

### [Fix] Mutation badges showing incorrect position for first nucleotide [#745](https://github.com/nextstrain/nextclade/issues/745)

We fixed a bug where mutations at position 1 were incorrectly showing position 0 in Nextclade Web


## Nextclade Web 1.13.2, Nextclade CLI 1.10.3, Nextalign CLI 1.10.3 (2022-02-15)

This is a bug fix release.

### [Fix] Ignore private reversions of deletions when calculating divergence

Since their introduction, individual private reversions of deletions contributed extra to divergence. This was unexpected, so we removed reversions of deletions from consideration when calculating divergence in Nextclade.

### [Fix] Sort private substitutions on the tree

Private substitutions are now sorted by position when they are displayed on the tree page

### [Fix] "truncated" text in the insertions tooltip

In Nextclade Web, long insertions no longer have a visual bug when the "truncated" text is displayed twice.


## Nextclade Web 1.13.1, Nextclade CLI 1.10.2, Nextalign CLI 1.10.2 (2022-02-01)

This is a bug fix release.

### [Fix] Exclude reversions of deletions from consideration in "SNP clusters" QC rule

Since introduction of reversions in Nextclade Web 1.13.0 and Nextclade CLI 1.10.0, "SNP clusters" QC rule have been including reversions of deletions when counting clustered private mutations. This was unexpected and produced false-positives for some of the sequences. To fix that, we removed the reversions of deletions from consideration of this QC rule, so that it behaves as previously.

### [Fix] Center markers in sequence view in Nextclade Web

In this version we improved the display of various colored markers (mutations, ranges etc.) in sequence and peptide views on the Results page of Nextclade Web. The individual markers are now centered around their position in the sequence (previously left-aligned). Although markers have moved by just a few pixels, this makes positioning more consistent, and ensures that different types of markers are correctly aligned across table rows.


## Nextclade CLI 1.10.1 (2022-01-26)

### [Fix] Improve error message when the virus properties file is missing [#704](https://github.com/nextstrain/nextclade/pull/704)

Since version 1.10.0 Nextclade CLI have introduced a new required input file, `virus_properties.json` and [datasets](https://github.com/nextstrain/nextclade_data/blob/master/CHANGELOG.md) and [documentation](https://docs.nextstrain.org/projects/nextclade/) were updated to match. However, users who don't use datasets might have encountered breakage due to a missing file: when running Nextclade CLI without either `--input-dataset` of `--input-virus-properties` flag provided, it would stop with an unclear error message. In this release we improve the error message, making sure that that explains the problem and offers a solution.

This does not affect Nextclade Web or Nextalign CLI.

In order to facilitate upgrades, for most users, we recommend to:

 - download the latest dataset before each Nextclade CLI session (e.g. in the beginning of an automated workflow, or once you start a batch of experiments manually) using `nextclade dataset get` command
 - use `--input-dataset` flag instead of individual `--input-*` flags for dataset files when issuing `nextclade run` command
 - if necessary, override some of the individual input files using corresponding `--input-*` flags


### [Fix] Add information about `virus_properties.json` or `--input-virus-properties` to changelog

In the excitement of bringing the new features, we forgot to mention `virus_properties.json` or `--input-virus-properties` in the changelog when Nextclade CLI 1.10.0 was released. We now added this information retroactively.


## Nextclade Web 1.13.0, Nextclade CLI 1.10.0, Nextalign CLI 1.10.0 (2022-01-24)

### 💥 [BREAKING CHANGE] Nextclade: new required input file: `virus_properties.json` [#689](https://github.com/nextstrain/nextclade/pull/689)

This version introduces a new required input file for Nextclade, called `virus_properties.json`. This file contains additional information necessary for the "Detailed split of private mutations" feature (see below). [The new versions of Nextclade datasets](https://github.com/nextstrain/nextclade_data/blob/master/CHANGELOG.md) were released to account for this change.

How it affects different tools in the Nextclade family and how to upgrade:

  - Nextclade Web - requires the new file. Migration path: no action is needed. Nextclade Web always uses the latest dataset automatically.

  - Nextclade CLI - requires the new file. Migration path:

    - Download the latest dataset with `nextclade dataset get` command (dataset tagged `2022-01-18T12:00:00Z` or more recent is required)
    - If using `--input-dataset` flag: the new file will be be picked up automatically from the latest dataset. No further action is needed.
    - If not using `--input-dataset` flag: add `--input-virus-properties` flag to pint to `virus_properties.json` file from the dataset.

  - Nextalign CLI - not affected: it does not use `virus_properties.json`. Migration path: no action is needed.


### [Feature] Detailed split of private mutations (Nextclade) [#689](https://github.com/nextstrain/nextclade/pull/689)

Private mutations (differences between a query sequence and nearest neighbour in reference tree) are now split into three categories:

1. Reversion to reference genotype
2. (SARS-CoV-2 only for now) Mutation to a genotype common in at least 1 clade get labeled with that clade
3. Mutations that are neither reversions nor labeled (called "unlabeled")

Which category a mutation belongs to is visible by hovering over the "Mut." column in Nextclade Web and in various "privateNucMutations" fields in [csv/tsv/json outputs](https://docs.nextstrain.org/projects/nextclade/en/stable/user/output-files.html#tabular-csv-tsv-results).

### [Change] "Private mutations" QC rule now accounts for reversions and labeled mutations

Reversions and labeled mutations (see feature above) are particularly common in contaminated samples, coinfections and recombination. To draw the user's attention to such sequences, both types of private mutation now get higher weights in the "Private mutations" QC rule (denoted as "P" in Nextclade Web, and `qc.privateMutations` in output files).

### [Feature] Insertions now also available as amino acids [#692](https://github.com/nextstrain/nextclade/pull/692)

Aminoacid insertions in the query peptides relative to the corresponding reference peptide are now displayed in the "Ins." column in Nextclade Web and are emitted as "aaInsertions" and "totalAminoacidInsertions" fields in Nextalign and Nextclade output files. Note, that similarly to nucleotide insertions, aminoacid insertions are stripped from the output alignment.

### [Fix] Gaps in query sequences are now stripped correctly [#696](https://github.com/nextstrain/nextclade/pull/696)

When query sequences contained gaps (-), e.g. when inputting aligned sequences, gaps were not stripped correctly since v1.7.0 (web v1.10.0), which could lead to - showing up in insertions.

## Nextclade Web 1.12.0, Nextclade CLI 1.9.0, Nextalign CLI 1.9.0 (2022-01-11)

### [Feature] Handle "-" strand gene translation

The strand column in the gene map file was previously ignored. Now the "-" strand genes are correctly reverse-complemented before translation.

### [Feature] Update SARS-CoV-2 clade schema

The schema that illustrates the tree of SARS-CoV-2 clade on the main page of Nextclade Web was updated to account for recent clade changes.

### [Fix] Center mutation markers in sequence views

Previously the mutation markers in sequence views in results table of Nextclade Web were anchored to their position in the sequence view on their left edge. They are now correctly centered around their position, such that the center of marker is at the corresponding position in the sequence.

### [Fix] Correct exit codes

Nextclade CLI and Nextalign CLI could sometime exit with incorrect exit code. This has been fixed.

### [Fix] Correctly handle empty peptides

The alignment algorithm in Nextclade CLI and Nextalign CLI could sometimes produce translation that is longer than expected, when the translated sequence is empty. Now the empty peptides are discarded and a warning is issued.

### [Fix] Ensure array boundaries

In rare cases Nextclade and Nextalign algorithms could sometimes read past the end of arrays, which previously went undetected. This is now fixed.

## Nextclade Web 1.11.1, Nextclade CLI 1.8.1 (2022-01-07)

### [Hotfix] Nextclade CLI crashes on macOS when reading JSON tree (#680)

Fixes crash `Error: [json.exception.invalid_iterator.214] cannot get value |` when reading JSON tree on macOS

## Nextclade Web 1.11.0, Nextclade CLI 1.8.0 (2022-01-04)

### [Feature] Better dataset selector

Nextclade Web has got the new dataset selector on the main page, which clearly presents all available dataset and is more convenient to use. The last selected dataset is remembered, so that it dow not need to be selected again on subsequent runs. This also fixes rare problems and inconsistencies, when incorrect dataset might have been used despite another dataset is being selected.

### [Feature] Dynamic node attributes

Nextclade CLI and Nextclade Web now can assign multiple clade-like attributes to the analyzed sequences.

If input reference tree JSON contains an array of attribute keys attached to the

```js
meta.extensions.nextclade.clade_node_attrs_keys = ["my_clades", "other_clades"]
```

For each query sequence, during clade assignment step, Nextclade will lookup values of these keys from `.node.node_attrs` property of the nearest reference tree node and assign them to the corresponding properties of the newly attached nodes, just like it happens with the usual Nextstrain clades. This feature is currently not used with the default datasets, but we are planning to extend the reference trees in these datasets to take advantage of this feature. Curious users can start experimenting with their own reference trees and custom nomenclatures. Learn more about clade assignment in Nextclade in the [documentation](https://docs.nextstrain.org/projects/nextclade/en/latest/user/algorithm/06-clade-assignment.html).

### [Performance] Optimize match table lookups

In this version, alignment algorithm behind Nextclade and Nextalign is now up to 10% faster due to performance improvements in nucleotide and aminoacid table lookups.


## Nextclade Web 1.10.0, Nextclade CLI 1.7.0 (2021-12-09)

### [Performance] Optimize FASTA parser

The new optimized FASTA parser makes Nextclade CLI up to 60% faster and Nextalign CLI up to 500% faster when used on high-core-count machines. Nextalign and Nextclade now scale much better with number of available threads and rely less on I/O speed. See [#632](https://github.com/nextstrain/nextclade/pull/632) for more details.

### [Fix] Avoid crash due to buffer overflow

This is an internal fix of a problem that might have lead to a crash in rare cases, when coordinate map array was accessed beyond it's size.

## Nextclade Web 1.9.0, Nextclade CLI 1.6.0 (2021-12-07)

### [BREAKING CHANGE] [Fix] Remove unused CLI flags for aminoacid seed alignment

Seed matching step was removed in Nextalign and Nextclade CLI 1.5.0, however the command-line parameters previously providing configuration options for this step were not. In this version, the now unused family of `--aa-*` CLI flags is removed. Migration path: remove these flags from Nextclade CLI invocation.

### [Feature] Make "results" and "tree" pages full-width in Nextclade Web

The content in "results" and "tree" pages of Nextclade Web now occupies entire width available in the browser window, so that more useful information can be presented. In particular, sequence views should be more readable, especially on larger screens.

### [Feature] Dynamically adjust width of AA mutation markers

Nextclade Web now dynamically adjusts width of AA mutation markers in sequence views to avoid overly long mutation groups that may obscure other mutations. This is particularly important for sequences with high density of mutations.

### [Feature] Reduce probability of WebWorker timeout errors

On low-end computers, computers with slow internet connection or computers under heavy background resource utilization Nextclade Web could sometimes produce WebWorker timeout errors. This has been addressed by increasing the timeout interval from 10 seconds to 1 minute.

If this is not enough, consider freeing up system memory and CPU resources by closing unused applications and browser tabs, processing sequences in smaller batches, or using Nextclade CLI.

### [Fix] Fix off-by-one errors in insertion positions

Nextclade Web, Nextclade CLI and Nextalign could sometime produce incorrect positions for nucleotide insertions - off by 1 nucleotide to either direction. This was fixed in the new version.

### [Fix] Don't add private reversions when query aminoacid is unknown

In previous versions, if a query sequence, for one reason or another, had aminoacid X at the position where the parent tree node had a private mutation, Nextclade was incorrectly calling a new reversion at this position. This is now fixed and Nextclade will not report a reversion. We assume that in these situations the sequencing defect is more likely than a reversion.

### [Fix] Avoid potential dereference of nullopt

This is an internal fix of a problem that might have lead to a crash, but never manifested so far.


### [Fix] Avoid error when `--genes` flag contains a subset of genes

Nextclade 1.8.0 introduced an error when `--genes` flag contained only a subset of genes from the gene map. This is now resolved.


## Nextclade Web 1.8.1, Nextclade CLI 1.5.1 (2021-11-27)


### [Fix] Avoid crash when relative shift (bandwidth) is larger than query length

In rare cases Nextclade 1.5.0 could crash during alignment of some of the short peptides. This has been fixed in this version.


### [Fix] Improve peptide alignment

We improved heuristics which determine band width and shift for the peptide alignment, so that some of the peptides with large insertions can now be aligned.



## Nextclade Web 1.8.0, Nextclade CLI 1.5.0 (2021-11-27)

### [Feature] Improve peptide alignment

We improved the algorithm for peptide alignment. Instead of performing seed matching in order to estimate width of the band and shift parameters for peptide alignment, we now deduce these parameters from the nucleotide alignment results. This allows Nextclade to align and analyse some of the peptides that would fail previously, including for low quality gene sequences and sequences with large deletions or deletions close to the beginning.

### [Fix] Account for the partially covered last codon in frame shift

Nextclade previously did not account for the last codon in a frame shift if that codon was covered by the shift only partially. In this version we count the partial codons. This solves an issue with empty frame shift codon ranges being reported in rare cases. This change may result in some of the frame shifts to be longer by 1 codon in the new version compared to previous versions of Nextclade. The nucleotide length of frame shifts stays the same.

None of the ignored frame shift ranges in the QC configurations of the existing dataset are affected by this change. But if you use a custom QC configuration, some of the frame shifts in the list of ignored frame shifts might need to be adjusted.

### [Fix] Fix crashes with Nextclade CLI on macOS

In this version we fixed a crash with segmentation fault that could sometimes happen with Nextclade CLI on macOS.

## Nextclade Web 1.7.4 (2021-11-16)

This is a bugfix release for Nextclade Web.

### [Fix] Ensure that URL parameters always have effect

Due to an internal error in Nextclade Web, sometimes inputs provided using URL parameters were ignored. This has been fixed now. Only users and external integrations which explicitly use URL parameters to pass data into Nextclade Web were affected. See [documentation for Nextclade Web: URL parameters](https://docs.nextstrain.org/projects/nextclade/en/stable/user/nextclade-web.html#url-parameters) for more details.

### [Feature] Update Auspice

In this release we updated Nextstrain Auspice (the tree visualization package) to version v2.32.1, with the new features and bug fixes. See [Auspice project's changelog](https://github.com/nextstrain/auspice/blob/master/CHANGELOG.md#version-2321---20211111) for more details.


## Nextclade Web 1.7.3, Nextclade CLI 1.4.5 (2021-11-04)

This is a bugfix release for Nextclade Web and Nextclade CLI.

After Nextclade Web version 1.7.3 and Nextclade CLI version 1.4.3 the "Private mutations" QC check was incorrectly counting individual deletions, rather than contiguous ranges of deletions, as it was before that. This resulted in QC score being too high for sequences that have many deletions. In this version we ensure again that the deletion ranges are counted. This should now bring the "Private mutations" QC score back to what is expected.

## Nextclade CLI 1.4.4 (2021-11-01)

This is a bugfix release for Nextclade CLI.

### [Fix] Prevent Nextclade CLI failing with error "Library not loaded"

The mistake in the Nextclade CLI build was fixed and now it should not look for external libraries on macOS.

## Nextclade Web 1.7.2, Nextclade CLI 1.4.3 (2021-11-01)

This is a bugfix release for nextclade Web and Nextclade CLI.

### [Fix] Properly display private aminoacid mutations on the tree

This release ensures that both nucleotide and aminoacid mutations on the branches of the phylogenetic tree leading to the nodes representing analyzed sequences are properly displayed and that the corresponding information is correctly written to the output tree JSON. Similarly to how it's done in the main Nextstrain project, these mutations are private, i.e. called relative to the parent node.

The internal reorganization of the code responsible for finding private mutations might also make Nextclade slightly faster and to consume less memory.


## Nextclade CLI 1.4.2 (2021-10-26)

This is a small bugfix release and only affects Nextclade CLI. Nextclade Web and Nextalign CLI are unchanged.

### [Fix] Crash in dataset list command on macOS

Nextclade CLI could sometimes crash on macOS when issued a `dataset list` command due to an internal error. This was now fixed.


### [Fix] Uninformative error message when QC config is missing

When both `--input-dataset` and `--input-qc-config` flags are omitted Nextclade CLI now produces a more informative error message, as was intended. Thanks Peter Menzel ([@pmenzel](https://github.com/pmenzel)) for the report.


## Nextclade Web 1.7.1, Nextclade CLI 1.4.1 (2021-10-05)

### [Fix] Format of CSV/TSV output files

We fixed a few mistakes in CSV and TSV output files, such as missing last delimiter when the "errors" column is empty, inconsistent application of quotation marks and incorrect numeric formats - decimals when integers should be.

## Nextclade Web 1.7.0, Nextclade CLI 1.4.0, Nextalign CLI 1.4.0 (2021-09-30)

### [Feature] Frame shift detection

Nextclade now can detect [reading frame shifts](https://en.wikipedia.org/wiki/Frameshift_mutation) in the analyzed sequences and report them in the web interface as well as in the output files.

#### Background

Frame shift occurs when a sequence contains a range of indels (deletions and/or insertions) and the total length of this range is not divisible by 3. In this case the grouping of nucleotides into codons changes compared to the reference genome and the translation of this region manifests in the peptide as a range consisting almost entirely from aminoacid mutations.

Frame shifts can often be found towards the end of genes, spanning until or beyond the gene end. Sometimes, when indels occur in multiple places, the ones that follow can compensate (cancel) the frame shift caused by the previous ones, resulting in frame shift that spans a range in the middle of the gene. In these cases, due to extreme changes in the corresponding protein, the virus is often not viable, and are often a sign of sequencing errors, however, cases of biological frame shifts are also known. Sometimes, frame shifts can also introduce premature stop codons, causing the gene to be truncated. The premature stop codons within frame shifts are currently not (yet) detected by Nextclade.

#### Previous behavior

Previously, Nextclade was not able to detect frame shifts ranges specifically. Instead, a frame shift was suspected in a gene when the gene length was not divisible by 3 (hinting to indels of a total length not divisible by 3). In these cases the entire gene was omitted from translation, a warning was issued, and aminoacid changes in that gene could not be detected and reported.

#### New behavior

Now that Nextclade knows the exact shifted ranges for each gene, it translates the genes with frame shifts, but masks shifted regions with aminoacid `X` (unknown aminoacid). The aminoacid changes in non-frame-shifted regions within such genes are now reported. This means that in some sequences Nextclade can now detect more mutations than previously. The affected genes are now emitted into the output fasta files instead of being discarded.

#### Frame shifts report in Nextclade Web

Frame shifted ranges are denoted as red horizontal (strikethrough) lines with yellow highlights in the "Sequence view" and "Gene view" columns of the results table of Nextclade Web. The new "FS" column shows number of detected frame shifts: unexpected and known (ignored) ones (see the QC changes below for more details).

#### Frame shifts report in the output files

Frame shifted ranges (in codon coordinates) are reported in CSV and TSV output files in column named `frameShifts` and in JSON output file under `frameShifts` property.


### [Feature] Improved frame shift quality control (QC) rule

Previously, frame shift quality control rule (denoted as "F" in Nextclade Web) was relying on gene length to reason about the presence of frame shifts - if a gene had length not divisible by 3 - a warning was reported.

Now this rule uses the detected frame shift ranges to make the decision. There now can be more than one frame shift detection per gene and Nextclade now accounts for compensated frame shifts, which were previously undetected.

In the new implementation of the Frame Shift QC rule, some of the frame shift ranges are considered "ignored" or "known" (as defined in `qc.json` file of the dataset). These frame shifts don't cause QC score penalty.


### [Feature] New version of SARS-CoV-2 dataset

We simultaneously release a new version of SARS-CoV-2 dataset, which contains an updated tree and clades, as well as a new set of frame shift ranges and stop codons to ignore. For the details refer to the [dataset changelog](https://github.com/nextstrain/nextclade_data/blob/release/CHANGELOG.md).

Nextclade Web uses the latest version of the datasets by default and CLI users are encouraged to update their SARS-CoV-2 dataset with the `nextclade dataset get` command.


### [Feature] Optional translation beyond first stop codon

By default Nextalign CLI and Nextclade CLI translate the whole genes, even if stop codons appear during translation. In this release we added a flag `--no-translate-past-stop`, which if present, makes translation to stop on first encountered stop codon. The remainder of the peptide is the filled with gap (`-`) character. This might be useful in some cases when a more biological behavior of translation is desired.


## Nextclade Web 1.6.0, Nextclade CLI 1.3.0, Nextalign CLI 1.3.0 (2021-08-31)

### [Feature] Nextclade Datasets

In this release we introduce Nextclade Datasets, a convenient way of downloading files required for Nextclade analysis. Now data files (such as reference sequences, reference tree and others) are served for all users from a **central dataset repository**.

#### Datasets in Nextclade Web

The dropdown menu in **Nextclade Web** now allows user to chose between available datasets before analysis and automatically fetches the latest files from the central dataset repository.

#### Datasets in Nextclade CLI

**Nextclade CLI** gained new commands and flags to manage datasets:

 - `nextclade dataset list` command allows to list available datasets
 - `nextclade dataset get` command allows to download a dataset to a directory
 - `nextclade run` command runs the analysis (for compatibility with old version the word `run` can be omitted) and the new `--input-dataset` flag allows to specify the directory of the previously downloaded dataset

##### Quick example

```
nextclade dataset get --name=sars-cov-2 --output-dir=data/sars-cov-2

nextclade run \
  --input-fasta=data/sars-cov-2/sequences.fasta \
  --input-dataset=data/sars-cov-2 \
  --output-tsv=output/nextclade.tsv \
  --output-tree=output/nextclade.auspice.json \
  --output-dir=output/
```

See [Nextclade CLI](https://docs.nextstrain.org/projects/nextclade/en/latest/user/nextclade-cli.html) documentation for example usage and [Nextclade Datasets](https://docs.nextstrain.org/projects/nextclade/en/latest/user/datasets.html) documentation for more details about datasets.


Note, data updates and additions are now decoupled from Nextclade releases. The datasets will be updated independently.  Read [datasets documentation](https://docs.nextstrain.org/projects/nextclade/en/latest/user/datasets.html) on dataset versioning and a trade-off between reproducibility or results vs latest features (e.g. clades and QC checks).


### [Feature] Flu datasets in Nextclade

With this release, additionally to the previously available SARS-CoV-2 dataset, we introduce 4 new Influenza datasets:

 - Influenza A H1N1pdm (rooted at "A/California/07/2009")
 - Influenza A H3N2 (rooted at "A/Wisconsin/67/2005")
 - Influenza B Victoria (rooted at "B/Brisbane/60/2008")
 - Influenza B Yamagata (rooted at "B/Wisconsin/01/2010")

These datasets allow Nextclade to analyze sequences for these pathogens.

Nextclade Datasets feature simplifies adding new pathogens in Nextclade and we hope to add new datasets in the future.


### [Deprecation] Data files in Nextclade GitHub repository are deprecated

The files in [`/data`](https://github.com/nextstrain/nextclade/tree/37f07156118cbff252b5784fe2261bccdb580943/data/) directory of the Nextclade GitHub repository are now deprecated in favor of Nextclade Datasets feature.

These files will be deleted from repository on October 31st 2021, but will be still available in git history. We do not recommend to use these files, as they will no longer be updated.


## Nextclade Web 1.5.4 (2021-08-16)

#### [Feature] Add "Docs" link

Top navigation bar now contain an new link "Docs", which points to Nextclade Documentation site (https://docs.nextstrain.org/projects/nextclade).


## Nextclade CLI 1.2.3, Nextalign CLI 1.2.3 (2021-08-12)

This release only affects docker images. There are no actual changes in Nextclade CLI, Nextalign CLI or Nextclade Web. They should behave the same as their previous versions.

#### [Change] Add `ca-certificates` package into Debian docker images

For better compatibility with workflows, this adds CA certificates into the Debian docker images. They are necessary for SSL/TLS to be working, in particular when fetching data.

These are the default images when you pull `nextstrain/nextclade` and `nextstrain/nextalign` without specifying a tag or specifying one of the `debian` tags. Issue `docker pull nextstrain/nextclade` to refresh the local image to the latest version.


## Nextclade CLI 1.2.2, Nextalign CLI 1.2.2 (2021-08-12)

This release only affects docker images. There are no actual changes in Nextclade CLI, Nextalign CLI or Nextclade Web. They should behave the same as their previous versions.

#### [Change] Add `ps` utility into Debian docker images

This adds `ps` utility into the Debian docker images. For better compatibility with nextflow workflows.

These are the default images when you pull `nextstrain/nextclade` and `nextstrain/nextalign` without specifying a tag or specifying one of the `debian` tags.


## Nextclade Web 1.5.3, Nextclade CLI 1.2.1, Nextalign CLI 1.2.1 (2021-08-10)

#### [Bug fix] Incorrect ranges in "SNP clusters" QC rule

"SNP clusters" QC rule could sometimes produce ranges of SNP clusters with incorrect boundaries (begin/end). This is now fixed.


#### [Bug fix] Crash with incorrect colorings in the input reference tree

Fixed a rare crash in Nextclade CLI and Nextclade Web when input reference tree contained incorrect fields in "colorings" section of the tree JSON file.

#### [Change] Cleanup the tree node info dialog

Removed redundant text entries in the tree node info dialog (when clicking on a node in the tree view). All these entries are still presented in the results table.

#### [Change] Cleanup the tree node info dialog

Improved wording of the message in the "Private mutations" QC rule tooltip.

#### [Change] New docker container images for Nextclade CLI and Nextalign CLI

New Docker images are available based on Debian 10 and Alpine 3.14. Debian images contain a set of basic utilities, such as `bash`, `curl` and `wget`, to facilitate usage in workflows.

You can choose to use the latest available version (`:latest` or no tag), or to freeze a specific version (e.g. `:1.2.1`) or only major version (e.g. `:1`), or a base image (e.g. `:debian`) or both version and base image (`:1.2.1-debian`), or mix and match.

Tag `:latest` now points to `:debian`. For previous behavior, where `:latest` tag pointed to `FROM scratch` image, use tag `:scratch`.

Full list of tags is below.

Image based on Debian 10 is tagged:
```
nextstrain/nextclade
nextstrain/nextclade:latest
nextstrain/nextclade:1
nextstrain/nextclade:1.2.1

nextstrain/nextclade:debian
nextstrain/nextclade:latest-debian
nextstrain/nextclade:1-debian
nextstrain/nextclade:1.2.1-debian
```

Image based on Alpine 3.14 tagged:
```
nextstrain/nextclade:alpine
nextstrain/nextclade:latest-alpine
nextstrain/nextclade:1-alpine
nextstrain/nextclade:1.2.1-alpine
```

Previously default `FROM scratch` image is tagged:
```
nextstrain/nextclade:scratch
nextstrain/nextclade:latest-scratch
nextstrain/nextclade:1-scratch
nextstrain/nextclade:1.2.1-scratch
```






## Nextclade Web [1.5.2](https://github.com/nextstrain/nextclade/compare/1.5.1...1.5.2) (2021-07-11)


#### [Bug fix] Workarounds for Safari web browser

The following problems are addressed:

 - crash due to Safari requiring incorrect Content Security Policy when using WebAssembly modules (see issue [#476](https://github.com/nextstrain/nextclade/issues/476))
 - results table and tree not being displayed correctly or at all, due to flexbox layout bugs in older versions of Safari

These patches only affect users of Safari web browser, and should not affect other users.

Despite these fixes, for best experience and speed, we still recommend using Nextclade with Chrome or Firefox web browsers instead of Safari.


## Nextclade Web [1.5.1](https://github.com/nextstrain/nextclade/compare/web-1.5.0...web-1.5.1) (2021-07-08)

#### [Bug fix] Better clade assignment

In this release we updated the default reference tree. The previous tree had several basal 20A branches misplaced in clade 20C, resulting in incorrect clade calls. The new tree addresses this issue and generally improves the quality of the tree by removing outlier sequences. Nextclade Web already have the new tree, and users of Nextclade CLI are encouraged to download and use the new [tree.json](https://raw.githubusercontent.com/nextstrain/nextclade/64cb47c1be99b82e1f25c9ebbee6ce2441d9cb2b/data/sars-cov-2/tree.json).


## Nextclade Web [1.5.0](https://github.com/nextstrain/nextclade/compare/web-1.4.0...web-1.5.0) (2021-07-01)

#### [New feature] New SARS-CoV-2 clades: 21G (Lambda) and 21H

The updated default SARS-CoV-2 reference tree now contains the recently named Nextstrain clades 21G (Lambda) and 21H, corresponding to Pango lineage C.31 and B.1.621. This allows Nextclade Web to detect these clades. Users of Nextclade CLI are encouraged to download and use the new [tree.json](https://raw.githubusercontent.com/nextstrain/nextclade/d80124010d022a16c59977f97f563522a3ca67e1/data/sars-cov-2/tree.json).

Note, that gene ORF3a of clade 21H has a 4-base deletion towards the end of the coding sequence, resulting in a frameshift and a protein truncation. This frameshift is currently flagged as a potential QC issue though it likely is biological (present in the viral genome).


#### [Change] Adjusted Quality control (QC) scores for "Frame shifts" (F) and "Stop codons" (S) rules

We adjusted QC score calculation for "Stop codons" and "Frame shifts" rules, such that each detection (of a misplaced stop codon or a frame shift, respectively) results in adding 75 to the score (the higher the score the worse). This lowers the score for sequences with only 1 frame shift and 1 stop codon. This is to account for the findings is clade 21H, as described above.


#### [Bug fix] Removed unsequenced regions of length 0

We fixed a bug where the empty unsequenced regions on either ends of a fully sequenced sample, were incorrectly displayed as ranges of length 1 in nucleotide sequence view. Now, in case of full sequences, there will be no unsequenced areas drawn, as expected.


## Nextclade Web 1.4.0, Nextclade CLI 1.2.0, Nextalign CLI 1.2.0 (2021-06-24)


### Nextclade Web and Nextclade CLI

#### [New feature] Quality control (QC) rules: "Frame shifts" (F) and "Stop codons" (S)

We have added two additional QC rules designed to flag sequences that likely do not correspond to functional viruses.

##### "Stop codons" rule (S)

Checks if any of genes have premature stop codons. A stop codon within a gene will now result in a QC warning, unless it is one of the very common stop codons in ORF8 at positions 27 or 68. This list of ignored stop codons is defined in [the `stopCodons.ignoredStopCodons` property of the QC configuration file (`qc.json`)](https://github.com/nextstrain/nextclade/blob/e885faa1d605742e2d546b286caa3eafe6e76b7d/data/sars-cov-2/qc.json#L28-L31) and can be adjusted. The default list might be extended in the future.

Results of this check are available in JSON, CSV, and TSV output files as `qc.stopCodons`. In Nextclade Web it is displayed in the "QC" column of the results table as a circle with letter "S" in it.


##### "Frame shifts" rule (F)

Checks and reports if any of the genes have a length that is not divisible by 3. If at least one such gene length is detected, the check is considered "bad". Failure of this check means that the gene likely fails to translate.

Results of this check are available in JSON, CSV, and TSV output files as `qc.frameShifts`. In Nextclade Web it is displayed in the "QC" column of the results table as a circle with letter "F" in it.


#### [Change] Quality control (QC) configuration file updated

New entries were added to the QC configuration file (`qc.json`) for the two new rules. For Nextclade CLI users, we recommend to download the new file from our [`data/` directory on GitHub](https://github.com/nextstrain/nextclade/tree/master/data).

This file is now versioned using the new `schemaVersion` property. If the version of `qc.json` is less than the version of Nextclade CLI itself, users will now receive a warning.

All QC checks are now optional: a rule that has no corresponding config object is automatically disabled.

#### [Bug fix] CSV/TSV output files corrected

This release corrects a few issues with CSV/TSV output files:

 - quotation marks are now escaped correctly
 - special characters are now surrounded with quotes
 - line breaks are now encoded as `CR LF` for better compatibility and consistency with Nextclade 0.x
 - column shifts are now prevented in CSV/TSV results when some of the QC checks are disabled, as disabled checks return empty strings as result


### Nextclade Web


#### [Bug fix] Ranges displayed off-by-one in GUI

Ranges displayed in Nextclade Web were off-by-one due to a front-end bug. Ends of ranges (right boundaries) were extending one unit too far. This means that alignment ranges, missing nucleotide ranges, ranges of gaps, not-sequenced ranges, were all displayed 1 unit longer than they should have been be. This release fixes this problem.

Only the display in the results table of Nextclade Web is affected. None of the output files, either produced by Nextclade CLI or by Nextclade Web are affected.

#### [New feature] Insertions displayed in the results table

A new column for insertions (abbreviated as "Ins.") was added to the results table of Nextclade Web. It shows the total number of inserted nucleotides. Hovering reveals more details about each insertion. This information was already available in the output files, and is now also shown in the GUI.


### Nextalign CLI

There are no changes in Nextalign in this release, but we keep versions of Nextalign and Nextclade in sync.



## Nextclade Web 1.3.0, Nextclade CLI 1.1.0, Nextalign CLI 1.1.0 (2021-06-22)


This series of releases adds a new output file `nextclade.errors.csv` to all tools and adds the output file `nextclade.insertions.csv` to Nextclade Web (it has already been available for users of CLI tools).

`nextclade.insertions.csv` contains information about insertions in the following columns: `seqName`, `insertions`. The column `insertions` contains a list of nucleotide insertion entries delimited by semicolon. Each nucleotide insertion entry consists of the position of the first nucleotide and the inserted fragment, delimited by colon.

`nextclade.errors.csv` contains information about errors, warnings and gene processing failures in the following columns: `seqName`, `errors`, `warnings`, `failedGenes`. All lists are semicolon-delimited.

In both files, each row corresponds to one sequence, identified by `seqName`.


## [1.2.0](https://github.com/nextstrain/nextclade/compare/1.2.0...1.1.0) (2021-06-21)

### Nextclade web application

In this release we improve how low-memory conditions are handled in the Nextclade web application. From now on, when Nextclade runs out of system memory (RAM), you will receive an extensive error message with a list of possible ways to address the issue.

A settings dialog was added, allowing the user to change the number of CPU threads. It can be opened using the new "Settings" button on the top panel. In Chrome and other Chromium-based browsers (Edge, Brave, etc.) the dialog also displays the amount of memory available and on this basis provides a suggestion for the number of CPU threads for optimal performance.

Note that these user settings persist across browsing sessions, Nextclade runs, page refreshes and Nextclade version updates.


## [1.1.0](https://github.com/nextstrain/nextclade/compare/1.1.0...1.0.1) (2021-06-15)

### Nextclade web application

This release makes gene translation failures more apparent in Nextclade Web application.

Previously, when a gene failed to be translated, Nextclade showed a blank row in the gene view in the results table and it was hard to understand whether there were no aminoacid changes or the translation had failed. Now, these rows will be colored in dark gray, contain a message, and some detailed information in the tooltip.

This should hopefully make it clearer which genes are missing from the results and why.


## [1.0.1](https://github.com/nextstrain/nextclade/compare/1.0.1...1.0.0) (2021-06-12)

### Nextclade web application

This release fixes a problem in Nextclade web application where non-fatal errors during sequence processing (such as sequence alignment failures) were crashing the whole application, displaying an error dialog window.

Now sequence analysis errors are reported right in the table, as before.

Thanks Joan Gibert ([@Tato14](https://github.com/Tato14)) for the bug report ([#434](https://github.com/nextstrain/nextclade/issues/434))

## [1.0.0](https://github.com/nextstrain/nextclade/compare/1.0.0...0.14.4) (2021-06-11)

This major release brings many new features and bug fixes.

We release new versions of all of the tools in Nextclade family: Nextclade web application, Nextclade CLI and Nextalign CLI.

> With this major release we introduce breaking changes. In particular, changes to input and output file formats as well as to arguments of command-line tools. The breaking changes are marked with "💥 **BREAKING CHANGE**" prefix. It is recommended to review these changes.

Below is a description of changes compared to version 0.14.4.

### General

Changes that affect all tools:

 - The underlying algorithm has been completely rewritten in C++ (versions 0.x were implemented in JavaScript), to make it faster, more reliable and to produce better results. Web application now uses WebAssembly modules to be able to run the algorithm.

 - 💥 **BREAKING CHANGE:** Nextclade now uses Nextalign algorithm for the alignment and translation of sequences. This means that nucleotide alignment is now aware of codon boundaries. Alignment results and some of the analysis results might be slightly different, depending on input sequences.

 - Similarly to Nextalign, Nextclade can now output aligned peptides. In general, Nextclade is a superset of Nextalign and can do everything Nextalign can, plus more (for the price of additional computation).

 - 💥 **BREAKING CHANGE:** Gene maps are now only accepted in [GFF3 format](https://github.com/The-Sequence-Ontology/Specifications/blob/master/gff3.md). See an example at [GitHub](https://github.com/nextstrain/nextclade/blob/master/data/sars-cov-2/genemap.gff). Migration path: use provided default gene map or convert your custom gene map to GFF3 format.

 - 💥 **BREAKING CHANGE:** JSON results file format has changed. It now contains an object instead of an array as a root element. The array of results is now attached to the `results` property of the root object. Migration path: instead of using `output` array directly use `output.results` now.

 - 💥 **BREAKING CHANGE:** JSON fields and CSV/TSV columns `totalMutations` and `totalGaps` were renamed to `totalSubstitutions` and `totalDeletions`, for consistency. Migration path: use new JSON property or column names.

### Nextclade web application v1

Web application mostly maintains it previous interface, with small improvements and with adjustments to the new underlying algorithm implementation.

 - New "Download" dialog was introduced, which replaces the old "Export" dropdown menu. It can be toggled by clicking on "Download" button on "results" page.

 - Aligned sequences now can be downloaded in the new "Download" dialog.

 - Translated aligned peptides now can be downloaded in the new "Download" dialog.

 - "Sequence view" column of the results table now can be switched between "Nucleotide sequence" view and "Gene" view. In "Gene" view, aminoacid mutations and deletions are displayed for a particular gene.

 - "Sequence view" can also be switched by clicking on a gene in "Genome annotation" panel below the results table.

 - Results table tooltips has been cleaned up, information was spread between corresponding columns, in order to fit the tooltips fully to common screen sizes. For example, list of mutations is now only available when mouse over the "Mut." column.

 - The tooltips to explore diversity have become much more informative. For amino acid changes, we now provide a nucleotide context view that is particularly helpful for complex mutations. Consecutive changes are merged into one tooltip.



### Nextclade CLI v1

Nextclade CLI v1 is a replacement for Nextclade CLI v0. It is recommended for advanced users, batch processing and for integration into pipelines.

 - Nextclade CLI 1.0.0 is available on [GitHub Releases](https://github.com/nextstrain/nextclade/releases) and on [DockerHub](https://hub.docker.com/r/nextstrain/nextclade):

 - Node.js is no longer required. Nextclade is now distributed as a standalone native executable file and is ready to be used after download. The latest version is available for major platforms at [Github Releases page](https://github.com/nextstrain/nextclade/releases).

 - The limitation of Node.js on maximum input file size (500 MB) is now removed. Nextclade should be able to handle large files and to use I/O resources more efficiently. Nextclade will stream sequence data to reduce memory consumption.

 - Nextclade CLI is much faster now. Depending on conditions, we measured speedups up to 5x compared to the old implementation.

  - 💥 **BREAKING CHANGE:** Nextclade no longer includes any default data. The following flags for input files were previously optional but are now required: `--input-root-seq`, `--input-tree`, `--input-qc-config`. The `--input-gene-map` flag is optional, but is highly recommended, because without gene map, the alignment will not be informed by codon boundaries and translation, peptide output and aminoacid change detection will not be available. The example SARS-CoV-2 data can be downloaded from [GitHub](https://github.com/nextstrain/nextclade/tree/master/data/sars-cov-2) and used as a starting point. Refer to built-in help for more details (`--help`). Migration path: download the default data add new flags if you you were previously not using them.

 - 💥 **BREAKING CHANGE:** Reference (root) sequence is no longer being written into outputs by default. Add `--include-reference` flag to include it. Reference peptides will also be included in this case. Migration path: use the mentioned flag if you need reference sequence results included into the outputs.

 - 💥 **BREAKING CHANGE:** Nextclade might write aligned sequences into output files in the order that is different from the order of sequences in the input file. If order is important, use flag `--in-order` to enforce the initial order of sequences. This results in a small runtime performance penalty. Refer to built-in help for more details (`--help`). Migration path: use the mentioned flag if you need results to be written in order.


### Nextalign CLI v1

Nextalign is a new tool that contains only the alignment and translation part of the algorithm, without sequence analysis, quality control, tree placement or other features of Nextclade (making it faster). It is available on [Github Releases page](https://github.com/nextstrain/nextclade/releases). Refer to built-in help for more details (`--help`).


### Deprecation of Nextclade CLI v0

 - Nextclade CLI 0.x is now deprecated and not recommended for general use. We recommend all users to migrate to version 1.x. Old versions will still be available on NPM and Docker Hub, but there are no plans to release new versions. Please reach out to developers if you still need support for versions 0.x.

 - Container images hosted on Docker Hub will now resolve to Nextclade family v1. In order to pull the version of family 0.x, use tag `:0` or a full version explicitly, for example `:0.14.4`:

  ```
  docker pull nextstrain/nextclade:0
  docker pull nextstrain/nextclade:0.14.4
  ```

We hope you enjoy the new release and as always, don't hesitate to reach out to Nextstrain team on [Nextstrain discussion forums](https://discussion.nextstrain.org/) or on [GitHub](https://github.com/nextstrain/nextclade/issues/new/choose).


## [0.14.4](https://github.com/nextstrain/nextclade/compare/1.0.0-alpha.9...0.14.4) (2021-06-07)

This version updates [the default SARS-CoV-2 reference tree](https://raw.githubusercontent.com/nextstrain/nextclade/0.14.4/data/sars-cov-2/tree.json) with new Nextstrain clade designations and alias names for the WHO VoC and VoI names, so that Nextclade now can detect these clades.

See also:

 - Original change in Nextstrain: [nextstrain/ncov#650](https://github.com/nextstrain/ncov/pull/650)

 - Current clade definitions in Nextstrain: [clades.tsv](https://github.com/nextstrain/ncov/blob/master/defaults/clades.tsv)

 - World Health Organization: [Tracking SARS-CoV-2 variants](https://www.who.int/en/activities/tracking-SARS-CoV-2-variants/)


## [0.14.3](https://github.com/nextstrain/nextclade/compare/1.0.0-alpha.8...0.14.3) (2021-05-20)

The [default SARS-CoV-2 reference tree](https://raw.githubusercontent.com/nextstrain/nextclade/0.14.3/data/sars-cov-2/tree.json) is updated. It allows Nextclade to detect the new Nextstrain clade 21A.

See also:

 - Current Nextstrain SARS-CoV-2 clade definitions in nextstrain/ncov GitHub repository: [clades.tsv](https://github.com/nextstrain/ncov/blob/master/defaults/clades.tsv)

 - Clade 21A in Nextstrain global build: [link](https://nextstrain.org/ncov/global?f_clade_membership=21A)

 - Variant 21A/S:154K on CoVariants.org: [link](https://covariants.org/variants/21A.S.154K)

 - Variant 21A/S:478K on CoVariants.org: [link](https://covariants.org/variants/21A.S.478K)


## [0.14.2](https://github.com/nextstrain/nextclade/compare/0.14.1...0.14.2) (2021-03-30)

We updated Nextstrain Auspice (the tree renderer) from version 2.18.2 to version 2.23.0, with bug fixes and new features. In particular, the filtering functionality is now similar to what can be found on nextstrain.org. We now color the tree by clade and filter by node type ("reference" vs "new" nodes). See [Auspice changelog](https://github.com/nextstrain/auspice/blob/master/CHANGELOG.md) for more details.

In other news, Nextalign 0.2.0 is now available. See Nextalign [changelog on GitHub Releases page](https://github.com/nextstrain/nextclade/releases).

### Bug Fixes

* account for the fact that the length of the gene can be different from %3 before stripping ([6fc99a0](https://github.com/nextstrain/nextclade/commit/6fc99a0d9b4c26f74955a8e87ad7d4a2938ff2c1))
* ensure backwards compatibility with the old GFF parser ([07156b7](https://github.com/nextstrain/nextclade/commit/07156b748ac36e7110d6b95877a849fc480e541c))
* ensure GFF3 spec compliance of gene map parser ([2355d3d](https://github.com/nextstrain/nextclade/commit/2355d3df6b011ef7c1998a5772a0babef9be9ad6))
* integer underflow in `parallelism` parameter to tbb pipeline ([42664e7](https://github.com/nextstrain/nextclade/commit/42664e7562aad39bdefac7f16c7f93830daedeb0))
* prevent local variable shadowing ([64c5661](https://github.com/nextstrain/nextclade/commit/64c5661f913dec991ae6472316ad9107c1e1df2c))
* prevent potential out-of-bounds array access ([4663b32](https://github.com/nextstrain/nextclade/commit/4663b3228b80f57a86aa1dd91d5bdfd90433adfc))
* query results are returned as alignment with insertions stripped, hence gap symbols in the reference should be stripped ([01e8628](https://github.com/nextstrain/nextclade/commit/01e8628fc7861f806fb7a4682356e891bd330c36))
* remove erroneous check for length%3==0 before gap removal ([d95761d](https://github.com/nextstrain/nextclade/commit/d95761d267090f285f3769d7d07772b4415e07e6))


### Features

* add more tree filtering criteria ([d852122](https://github.com/nextstrain/nextclade/commit/d8521221687bf0ba13b7deb3e24221fa6bd0b0ef))
* add tree filtering from auspice ([27eb67e](https://github.com/nextstrain/nextclade/commit/27eb67e3651df242c9170f64f63efefc168dd3f7))
* add tree filters summary ([67c671e](https://github.com/nextstrain/nextclade/commit/67c671ef85f1bd9c23a6c4b4f6ae03dda9b980c9))
* adjust help text and default flags for new data location ([27fd88e](https://github.com/nextstrain/nextclade/commit/27fd88e1cdacb926e32554e7937b05a9015427a9))
* color tree by clade and filter by Node Type - New by default ([79de7cd](https://github.com/nextstrain/nextclade/commit/79de7cd8fa73a7730a012fb3e84077751f614e2e))
* output aligned reference sequence, make ref outputs optional ([49da3f5](https://github.com/nextstrain/nextclade/commit/49da3f59200264b2f7de892cd79a911dc7820271))
* remove old tree filter panel ([13af3ad](https://github.com/nextstrain/nextclade/commit/13af3ad0d708cec9173b1eac922503c859d8ed4a))
* remove separate reference sequence output file ([5a899e2](https://github.com/nextstrain/nextclade/commit/5a899e2796b1b282ff8fca1e53b7b7b94e5e81d6))
* rename flag `--write-ref` to `--include-reference` ([36c52e9](https://github.com/nextstrain/nextclade/commit/36c52e9453fee61c694b9fc1d1246c3fe6130714))
* upgrade auspice to 2.23.0 ([276675b](https://github.com/nextstrain/nextclade/commit/276675bb4df6a81130e9ac8bc98c5588f2462bd2))



## [0.14.1](https://github.com/nextstrain/nextclade/compare/0.14.0...0.14.1) (2021-03-12)

This release of Nextclade adjusts the default Quality Control configuration to account for ever-increasing diversity of circulating SARS-CoV-2. The following default QC parameters have been changed:

Rule "Private mutations":

 - "typical" (expected number of mutations) increased from 5 to 8
 - "cutoff" (number of mutations to trigger QC warning) increased from 15 to 24

Rule "Mutation clusters":

 - "clusterCutOff" (number of mutations within window to trigger a warning) increased from 4 to 6

As always, users can provide their own QC configuration, to override the defaults, if these changes are not desirable.


Additionally, [Nextalign 0.1.7](https://github.com/nextstrain/nextclade/releases) is now available, which fixes rare crash in peptide alignment, when a low-quality sequence has not enough seed positions.


Don't hesitate to provide feedback, report issues and share ideas on [GitHub](https://github.com/nextstrain/nextclade/issues).


### Bug Fixes

* prevent crashing when not enough good gene seed positions ([6233aa2](https://github.com/nextstrain/nextclade/commit/6233aa28e1f9946d0e2ea388d025fc40c5af2a54))


Misc:

* relax SARS-CoV-2 QC parameters to account for increasing diversity of circulating virus


# [0.14.0](https://github.com/nextstrain/nextclade/compare/0.13.0...0.14.0) (2021-03-08)

This is a maintenance release which updates the default reference tree with more recent genomes and increases the number of sequences in it to better reflect circulating diversity.

Additionally, we extend our list of partial codon patches (first introduced in version 0.12.0), in order to correctly detect deletions involving spike protein positions 141 and 142.

There are also some small improvements in the user interface.

As always, don't hesitate to provide feedback, report issues and share ideas on [GitHub](https://github.com/nextstrain/nextclade/issues/new/choose).

The full list of changes is below.

### Bug Fixes

* add additional directions to patch partial codons ([d266fa7](https://github.com/nextstrain/nextclade/commit/d266fa71da6cdc6549dbf2d873ee94d6326634bf))
* Correct Node.js version requirement for the Nextclade CLI ([24c7b76](https://github.com/nextstrain/nextclade/commit/24c7b7608fe519c80109fb87d146d226e9200def))
* don't attempt to create directories from empty paths ([576eb9f](https://github.com/nextstrain/nextclade/commit/576eb9fec4303ad86c2d2722285c763c4f439219))
* increase clade column width to accommodate longer clade names ([557d3d2](https://github.com/nextstrain/nextclade/commit/557d3d227d2741a4b1b1f85e35665159b425a1e2))



## [0.13.0](https://github.com/nextstrain/nextclade/compare/0.12.0...0.12.1) (2021-02-17)

### 🚀 Announcing Nextalign

Today we announce Nextalign, the new command-line tool and the algorithm for viral genome alignment.

Nextalign is based on the alignment algorithm used in Nextclade, ported to C++ and made into the standalone command-line tool. Nextalign development is currently primarily focused on SARS-CoV-2, but it can be used with any virus (and if you encounter any difficulties, let us know [on GitHub](https://github.com/nextstrain/nextclade/issues/new)).

There are 2 ways of using Nextalign:

 - Download Nextalign on [Nextclade Github Releases page](https://github.com/nextstrain/nextclade/releases) to run natively

 - Use Docker container image: [nextstrain/nextalign](https://hub.docker.com/r/nextstrain/nextalign)

   ```
   docker run -it --rm nextstrain/nextalign:latest --help
   ```

Learn more about Nextalign [here](https://github.com/nextstrain/nextclade/tree/master/packages/nextalign_cli).


### 💥 [BREAKING CHANGE] Nextclade has moved!

Once started as a prototype project at [NeherLab](https://neherlab.org/), Nextclade is a part of [Nextstrain project](https://nextstrain.org/) for some time now. For consistency, we will now publish Nextclade in Nexstrain-branded NPM and DockerHub repositories:

 - NPM: [@nextstrain/nextclade](https://www.npmjs.com/package/@nextstrain/nextclade)

 - DockerHub: [nextstrain/nextclade](https://hub.docker.com/r/nextstrain/nextclade)


We added a "Downloads" section on the main page of Nextclade web application. Additionally, this release contains a few fixes to website's look & feel and slightly improves user experience on mobile devices.


### Bug Fixes

* accept 0-based frames as per gff spec ([5c3af28](https://github.com/nextstrain/nextclade/commit/5c3af28ca9afde60b9ad859d38143c9d278e5cea))
* adjust test expectations to new default parameters ([9a457c3](https://github.com/nextstrain/nextclade/commit/9a457c3648c1a38a9c714d62e79ba29a10902997))
* center main page content properly ([460464d](https://github.com/nextstrain/nextclade/commit/460464dc10f65a84a454b15a811a0abdfc830841))
* check for length being a multiple of 3 before codon aware stripping ([a33dd6b](https://github.com/nextstrain/nextclade/commit/a33dd6bfff2b363535ff90d8ee1ff80128a186ec))
* correct error message formatting ([016e924](https://github.com/nextstrain/nextclade/commit/016e92477a818f79f3cfbcfe4cedf425adfd499d))
* correct gene length check ([c6e488f](https://github.com/nextstrain/nextclade/commit/c6e488fb3a1dfe392a12f9c5da44bf531628f3b7))
* end of gene in gene extraction and cli logging ([16626fa](https://github.com/nextstrain/nextclade/commit/16626faecf388f2cadfb6e89ed93ba0b4ec976ad))
* fix non-responsive elements on main page ([36fa501](https://github.com/nextstrain/nextclade/commit/36fa501477aa72fef0e8604e9ecd0dbe06d92629))
* only protect gaps on the edges ([fef98c0](https://github.com/nextstrain/nextclade/commit/fef98c059dbc71194ac2a7f46c832f0c4ed8e5b2))
* pass gff filename to csv parser for more descriptive errors ([6843cc2](https://github.com/nextstrain/nextclade/commit/6843cc2981080c82478d15d30cbdbd926fd8f94c))
* pass the `score-gap-open-out-of-frame` option from cli into lib ([f9a435d](https://github.com/nextstrain/nextclade/commit/f9a435d7ea5dda3e45a21bd59879d39558e1f581))
* remove excessive padding around upload box ([34e7bce](https://github.com/nextstrain/nextclade/commit/34e7bce7d454b22ccada877a7231987ae4d1797b))
* remove gap under the footer ([d4db78b](https://github.com/nextstrain/nextclade/commit/d4db78bb1e9c56f5d40654c6a356f424df2279f2))
* remove horizontal overflow from main page ([d1061f5](https://github.com/nextstrain/nextclade/commit/d1061f591ddce012828799e0fd367252dcf86216))
* throw error when stripped sequence has zero length ([2b74257](https://github.com/nextstrain/nextclade/commit/2b74257ce5e1e4ae7b7f43cccb610a9864e92a38))


### Features

* add an option to allow out-of-order writes ([22702e3](https://github.com/nextstrain/nextclade/commit/22702e376a87708298948da8276640918818c71d))
* add downloads section to nextclade main page ([96bd007](https://github.com/nextstrain/nextclade/commit/96bd0074266f82570f29ba344ae9ba6dbe53bf23))
* add in-order CLI flag and make out-of-order behavior the default ([e722504](https://github.com/nextstrain/nextclade/commit/e722504726cdaec8885c1ce5a63a9fe86e9cb93c))
* add logger with configurable verbosity ([0a62c1f](https://github.com/nextstrain/nextclade/commit/0a62c1f24f3b1cdca8fce5063eb33176646b5066))
* add team portraits to main page ([7566b27](https://github.com/nextstrain/nextclade/commit/7566b27f0879f44e3e35aae26251006106befc1b))
* add validation for numeric cli params ([3915334](https://github.com/nextstrain/nextclade/commit/39153349dc9a8ff64b09d914d16c168aabaefc58))
* adjust team credits styling and text ([ba7f0ab](https://github.com/nextstrain/nextclade/commit/ba7f0ab1ccf6a3e455b851dc4078fbc30256f1c6))
* clarify descriptions for score-gap-open* family of cli options ([3765de8](https://github.com/nextstrain/nextclade/commit/3765de8a06a5aa21fff1799beeee0710589ae367))
* differentiate gap open cost outside of genes, in frame, and out of frame ([a5ead08](https://github.com/nextstrain/nextclade/commit/a5ead0877bebb2e4738e38060921d09f4914f9e1))
* don't use frame from gff ([d9f3023](https://github.com/nextstrain/nextclade/commit/d9f302356ec8e49f2ea668f0bf8a03af4a31ec47))
* expose nextalign algorithm params in cli ([852c2b1](https://github.com/nextstrain/nextclade/commit/852c2b153f0fe9089ebfea7ed5b1e5f035ccface))
* expose nextalign algorithm params in library ([5e3900a](https://github.com/nextstrain/nextclade/commit/5e3900a54c45ecf7b2da6497ffb6656196ca91ae))
* extend cli param descriptions ([a4ac1d5](https://github.com/nextstrain/nextclade/commit/a4ac1d5255e503d406c93cd92163fe7e4b5d76b2))
* extend project description ([30d104e](https://github.com/nextstrain/nextclade/commit/30d104ea7acf09709b1bc43e61d2901b12a11df6))
* further improve logging ([2f593f0](https://github.com/nextstrain/nextclade/commit/2f593f0f84c8e14ba960ba1ee04e62efb09d55c2))
* improve warning messages during gene extraction ([07e2c38](https://github.com/nextstrain/nextclade/commit/07e2c38be24d452a4cea6752965b6720bd606bd1))
* limit clade schema size ([a75dace](https://github.com/nextstrain/nextclade/commit/a75dacee525a5c64c38629c93ece19db052869a8))
* rename negative 'scores' to 'penalties' ([17bb582](https://github.com/nextstrain/nextclade/commit/17bb582566daf8ce22d3ea3840d29758b907a6e9))
* skip minimal sequence length check for aminoacid alignment ([394ca8e](https://github.com/nextstrain/nextclade/commit/394ca8e3887dd57344c276bb4848ff9099ff0974))
* validate codon-related penalty scores only if genes are provided ([9627cfc](https://github.com/nextstrain/nextclade/commit/9627cfc76bb6c500b19aeb3a8d0d05a3ed9431ab))



# [0.12.0](https://github.com/nextstrain/nextclade/compare/0.11.2...0.12.0) (2021-01-21)

This release provides a temporary solution for the problem when certain aminoacid deletions are not being detected properly.

We now maintain a list of "patches" to selectively modify the sequence during translation: the partial codons at the beginning and end of the deletion are combined to one complete codon. This way, deletions that start within a codon no longer result in invalid peptides, and some of the well-known deletions are now properly recognized.

See pull request [#308](https://github.com/nextstrain/nextclade/pull/308)

Thanks [@bede](https://github.com/bede), [@dbrandtner](https://github.com/dbrandtner), [@giuseppina950](https://github.com/giuseppina950), [@iskandr](https://github.com/iskandr), [@SarahNadeau](https://github.com/SarahNadeau) for their reports.

At the same time we are working on a more permanent solution.

Please report issues and leave feedback on [GitHub](https://github.com/nextstrain/nextclade/issues)

### Bug Fixes

* rename variable and fix condition ([40ba67f](https://github.com/nextstrain/nextclade/commit/40ba67f18ef17fa464c8dd70aae72d7025e88ff9))


### Features

* allow codon padding to happen forward and backward for custom cases ([945ca77](https://github.com/nextstrain/nextclade/commit/945ca77074b109f7688cbd677b05f8ff64b64613))
* properly translate out-of-frame gaps ([c34a640](https://github.com/nextstrain/nextclade/commit/c34a640586992e547eca71720b10790247b4d340))
* refactor the codon patching by gene and deletion start: ([7e258d8](https://github.com/nextstrain/nextclade/commit/7e258d8b6de671d90922480fe9893803139b867c))



## [0.11.2](https://github.com/nextstrain/nextclade/compare/0.11.1...0.11.2) (2021-01-18)

This release updates default reference tree and adds new clade designations.

Additionally, it fixes a problem of excess divergence in cases where there are gaps in the reference node we attach to. These gaps no longer contribute to divergence.

### Bug Fixes

* avoid counting every gap in a new node as one divergence unit ([51bfce6](https://github.com/nextstrain/nextclade/commit/51bfce6bfd66e783cca5f2c5cd93bf6b07b6dfde))



## [0.11.1](https://github.com/nextstrain/nextclade/compare/0.10.1...0.11.1) (2021-01-07)

BREAKING CHANGE: Starting with this version Nextclade uses the new Nextstrain clade definitions for SARS-CoV-2. "What are the clades?" section on the main page was updated accordingly. For more information on the updated clade definitions, see our [blog post](https://nextstrain.org/blog/2021-01-06-updated-SARS-CoV-2-clade-naming).

Additionally, Nextclade alignment algorithm was adjusted to correctly handle a few more corner cases. In particular, seed matching was improved to:
 * avoid stretches of `N` when choosing seeds
 * increase the number of seeds

The trimming of terminal `N` characters (introduced in 0.10.1) was removed, because the new improvements also handle this case.

Thanks [Stacia K Wyman](https://github.com/staciawyman) and [Syed Muktadir Al Sium](https://github.com/sium007) for the bug reports!

See also: [issue #288](https://github.com/nextstrain/nextclade/issues/288)
See also: [issue #290](https://github.com/nextstrain/nextclade/issues/290)


### Bug Fixes

* actually use the map to good characters ([c3a0a2c](https://github.com/nextstrain/nextclade/commit/c3a0a2c658accae04ff527a1ef6c5ea097e2aafe))
* remove old clades ([43f3c86](https://github.com/nextstrain/nextclade/commit/43f3c86a67d2b54ea19b4ab65637555f1f3c3894))


### Features

* add new clade schema ([5ab7054](https://github.com/nextstrain/nextclade/commit/5ab7054191a467694e6ba499a1b60e99ada7f738))
* improve seed matching by logging good nucleotides ([ce62478](https://github.com/nextstrain/nextclade/commit/ce6247816e79d2c8c161f44346368cf9c42abd68))
* increase number of seeds and reduce redundant seed search ([d1e0a2f](https://github.com/nextstrain/nextclade/commit/d1e0a2f15bc986e86996d4d62d48eb8fe556abd5))
* update SARSCoV2 tree.json ([880223e](https://github.com/nextstrain/nextclade/commit/880223e49df863deab749aa0378339660a6f3735))


## [0.10.1](https://github.com/nextstrain/nextclade/compare/0.10.0...0.10.1) (2020-12-30)

This release fixes a problem with input sequences with large chunks of `N` nucleotides at the edges.
To ensure correctness of results, before alignment we now trim contiguous blocks of `N`s at the beginning and at the end of each sequence.

Thanks [Stacia K Wyman](https://github.com/staciawyman) for the bug report.

See also: [issue #285](https://github.com/nextstrain/nextclade/issues/285)

### Bug Fixes

* trim leading and trailing to void seed matching problems ([17a554a](https://github.com/nextstrain/nextclade/commit/17a554ab28a80679fb2931c6469843e014d5fcbe))



# [0.10.0](https://github.com/nextstrain/nextclade/compare/0.9.0...0.10.0) (2020-12-21)


Nextclade (both, web and CLI versions) no longer uses or requires the standalone gene map file by default. Instead, it takes the corresponding information from `genome_annotations` field of the reference tree file (nowadays, this property is usually present in all Auspice JSON v2 files produced with Nextstrain's Augur). A standalone gene map file can still be provided, in which case it overrides the gene map found in the reference tree file.

In some cases, when there were multiple mutations in the same codon, Nextclade has been reporting aminoacid changes incorrectly, as if these changes were in separate codons having the same position. The reported changes would then list this aminoacid mutation twice, with the same position, but with two different resulting aminoacids (which is impossible). We adjusted the detection of aminoacid changes by performing full translation of every gene, so this issue is now fixed.

Nexclade now also reports aminoacid deletions. It no longer outputs `aminoacidChanges` field/column in JSON, CSV and TSV exports. Instead, it outputs separate `aaSubstitutions` and `aaDeletions` columns.

Nexclade is now better suited for the analysis of viruses other than SARS-CoV-2. We briefly tested it with the Flu virus, however, more testing is required. Please reach out to developers if you are interested in the analysis of other viruses.

The default reference tree has been updated.


### Bug Fixes

* add download location and local rules ([fbf6adc](https://github.com/nextstrain/nextclade/commit/fbf6adcd4cde76626ee6dbfd829e7b293667f18b))
* add reversion mutation to distance of attached tree nodes ([0889457](https://github.com/nextstrain/nextclade/commit/088945762bab189937134875715d1ef8f3bc3aea))
* avoid buffer overflow by using positions relative to the gene start ([faf2a88](https://github.com/nextstrain/nextclade/commit/faf2a88f4e858e7a9667069a351c61b4c43ace33))
* convert gene map to zero-based indices ([02b8b8e](https://github.com/nextstrain/nextclade/commit/02b8b8e13aadc8ba063869174c667f9b506ad6fb))
* corect the nuc position calculation relative to gene start ([97e4508](https://github.com/nextstrain/nextclade/commit/97e450894edd87fcc74b09225fb5653a8b5bd10a))
* correct deletion range end ([23b794c](https://github.com/nextstrain/nextclade/commit/23b794c84bbaf0c16d7e97e380528054c334f54f))
* ensure only full-codon nuc dels are associated with the aa dels ([0448d1f](https://github.com/nextstrain/nextclade/commit/0448d1f16d3f6ca440c18fe0770b22aa94f0ebc0))
* exclude aa deletions from aa substitutions ([bc188bd](https://github.com/nextstrain/nextclade/commit/bc188bd06aedd6fc016ada687ed67408cd5c0561))
* fix arguments to intersection in aa Association ([b75ff5c](https://github.com/nextstrain/nextclade/commit/b75ff5c1ac2e0482ac3f4e1a972e3ea883976e17))
* make sure query gene changes don't propagate to the ref gene ([61b9bf5](https://github.com/nextstrain/nextclade/commit/61b9bf5827bc1862ed74ef24111c1da4d7e81980))
* make sure the gene ranges are semi-open ([3d9754a](https://github.com/nextstrain/nextclade/commit/3d9754a1e8f8bf375c97b9ffae551f9306681dff))
* make sure the genes of the gene map are of correct length ([a737a5e](https://github.com/nextstrain/nextclade/commit/a737a5eab6a9d8d4b20e90d121e8fded9e5d4926))
* only count nucleotide substitutions towards divergence during tree attachment ([2f2305d](https://github.com/nextstrain/nextclade/commit/2f2305db71cfbdb0eb2485c9549469ce9bbaba98))
* rectify codon position calculation ([1e56a18](https://github.com/nextstrain/nextclade/commit/1e56a18934e0a4b075a3b029c9e23be524fbedc4))
* revise clade names ([79541b4](https://github.com/nextstrain/nextclade/commit/79541b43b2e9beffe5a453b571941b44987cc88b))
* revise clade names ([88e612d](https://github.com/nextstrain/nextclade/commit/88e612d0446e09d836f953be053e1fb1cc53b3b4))
* update genome size when custom root sequence is provided ([680e44c](https://github.com/nextstrain/nextclade/commit/680e44cf98c00b36174c892eba9d0b684ff80028))


### Features

* adapt filtering UI for the new aa subs and dels ([db97f2b](https://github.com/nextstrain/nextclade/commit/db97f2b31b776a21301df6cf3ed8f5995783ef56))
* adapt results serialization for the new aa subs and dels ([2be7de6](https://github.com/nextstrain/nextclade/commit/2be7de657aa25c5de6eee874d2d86591f347d899))
* adapt results table UI for the new aa subs and dels ([89e40be](https://github.com/nextstrain/nextclade/commit/89e40be896b4ab5879df941ecc8fd31e7ad59a7e))
* add aa deletions to the tree tooltips ([613971e](https://github.com/nextstrain/nextclade/commit/613971ef875a6619add2de2edc82eddedc1c4c3a))
* add additional checks when loading gene map ([1d39b4e](https://github.com/nextstrain/nextclade/commit/1d39b4e9e207e170b28c9ef7da7751eb42e180d1))
* add codons to the aa change objects ([d425981](https://github.com/nextstrain/nextclade/commit/d42598143c17e88f82810a6bd61c53c16a9e82e3))
* add subclades ([24b0abc](https://github.com/nextstrain/nextclade/commit/24b0abc0c59be31a9fbe44a6892faa9081f19bdd))
* guess unit of measurement of divergence ([8db8bde](https://github.com/nextstrain/nextclade/commit/8db8bde0e30a1d3f4531d88bc522f33901beac2b))
* improve reporting of bad codons ([66fc002](https://github.com/nextstrain/nextclade/commit/66fc002bf2e20584c41177a19d2e474ec88edd1f))
* list partial codons as mutations to X ([16e11d9](https://github.com/nextstrain/nextclade/commit/16e11d9d08404ed99910a609c1ba1a2087c259ef))
* re-associate nuc changes with their corresponding aa changes ([cc17a97](https://github.com/nextstrain/nextclade/commit/cc17a97bfe2506c3ddaf70d2386b06eef5ae069f))
* reimplement aminoacid changes extraction, extract deletions ([7472109](https://github.com/nextstrain/nextclade/commit/74721090b4b9b773a6cf5d9fa3d714ad4f73925f))
* take gene map from tree json ([9466d8f](https://github.com/nextstrain/nextclade/commit/9466d8fdcd8cad10fe5f65485a8a8a50a3fa640d))
* truncate aminoacid changes lists in tooltips ([a383b4c](https://github.com/nextstrain/nextclade/commit/a383b4cbb509c3dfc76ecae47244d7e0867d8730))



# [0.9.0](https://github.com/nextstrain/nextclade/compare/0.8.1...0.9.0) (2020-12-02)

This release is focused on advanced users of Nextclade web application. On the main page you can find the new "Advanced mode" toggle, which opens access to the additional parameters. There you can set custom input data: reference tree, root sequences, QC parameters, and PCR primers. For each filed you can provide a local file, a URL to a remote file, or paste the data into the text box directly. Parameters that are left blank will be substituted from Nextclade's defaults. All data formats are shared with the command-line version of Nextclade CLI.

You can find the full list of changes below:

### Bug Fixes

* avoid passing the DOM button click event to state ([6fb21de](https://github.com/nextstrain/nextclade/commit/6fb21dedf243f9a3d904f79f04e775d66386f9e0))
* correct grammar ([dd8f5af](https://github.com/nextstrain/nextclade/commit/dd8f5af5a5c591a4815cdc74cdd27b2fb18fb4ab))
* don't pass the custom props to DOM nodes ([cea8285](https://github.com/nextstrain/nextclade/commit/cea82859ddd55d15f3e05ea833824d6a8b016ec0))
* don't pass the custom props to DOM nodes (more) ([47b6fe0](https://github.com/nextstrain/nextclade/commit/47b6fe087824b0555bb3397548916086eeea2573))
* don't pass the custom props to DOM nodes (more) ([585642b](https://github.com/nextstrain/nextclade/commit/585642b6789904fc6f0bf1d87ae9918cc91a8705))
* remove delay in navigation to results page when after file loaded ([855e285](https://github.com/nextstrain/nextclade/commit/855e285c90def92f4684071fdddaffca3c926658))


### Features

* add advanced mode toggle ([da3e3d8](https://github.com/nextstrain/nextclade/commit/da3e3d874fa19af0e05fee13866fda457090f84d))
* add badges indicating default input state ([b6078fd](https://github.com/nextstrain/nextclade/commit/b6078fd146818ef0e127249c0760b9d4b3e929f1))
* add button and modal to create new runs ([f3b4f72](https://github.com/nextstrain/nextclade/commit/f3b4f72006cb77e8c5efc6532076b9e42c78787e))
* add mockup of advanced controls on main page ([31a3b30](https://github.com/nextstrain/nextclade/commit/31a3b301b12005f7a74a939fad68bbd5e2fefbf6))
* add placeholder for previous results section  ([5260682](https://github.com/nextstrain/nextclade/commit/5260682c657e39bb4b5a2cbc890befd8e3a747d8))
* add tooltip text for the run button ([5ba07ee](https://github.com/nextstrain/nextclade/commit/5ba07ee2a834d432e2293e558529b7b9a4fa422c))
* add tooltips and visual helpers to improve file picker ux ([666a842](https://github.com/nextstrain/nextclade/commit/666a84258a829e05183402fa3a687179e2e95603))
* align file picker header text ([5ff6eb5](https://github.com/nextstrain/nextclade/commit/5ff6eb5950677008a8426254daa6481f5f36c09c))
* bail out of data processing early on fetch failure from url params ([6e5b9a4](https://github.com/nextstrain/nextclade/commit/6e5b9a4167e4de3e15ad300cd43aecd48ca7af7a))
* center-align text ([fa72701](https://github.com/nextstrain/nextclade/commit/fa727015c05a19d01f8295e9f9bf17ad2fec164a))
* connect input controls to new input param state ([5744fcb](https://github.com/nextstrain/nextclade/commit/5744fcb071b6f7e843947f7c20cde48c1feb4af8))
* customize instruction and placeholder text on url and paste comps. ([2adbd92](https://github.com/nextstrain/nextclade/commit/2adbd9256fa0c5feae5c092a0aafa9ffcee0fa59))
* dim placeholder text color ([6585a10](https://github.com/nextstrain/nextclade/commit/6585a10e501693c3f5714fba974ffe61020f8e7f))
* disable virus selection dropdown and add a tooltip for it ([d3024c5](https://github.com/nextstrain/nextclade/commit/d3024c5ceb26d31d15c5e2f086dd7f10e527962b))
* fetch inputs from user-provided URL  ([e352814](https://github.com/nextstrain/nextclade/commit/e352814b73436e7ff9ad60624380f26932afcc00))
* handle errors in simple mode better ([417b11c](https://github.com/nextstrain/nextclade/commit/417b11c7b4a4046d7cd8979591ef07f1035a4181))
* improve file picker layout ([6e99fbb](https://github.com/nextstrain/nextclade/commit/6e99fbb957ebc7134d13ea4bfeab0eeec254b904))
* improve layout of main page ([29b99ef](https://github.com/nextstrain/nextclade/commit/29b99efe6864629e48c56ab9b585a0822a7a6dfb))
* improve layout of network error messages, clarify the text ([fd18f34](https://github.com/nextstrain/nextclade/commit/fd18f34da4b858b83d236b0a49c90c17fea2dab5))
* improve layout of tab-cards and URL tab body ([7775325](https://github.com/nextstrain/nextclade/commit/77753259cf4a749ed2610ed461b0a7c111aa695c))
* improve layout of the "paste" tab panel ([d111a96](https://github.com/nextstrain/nextclade/commit/d111a966012568be5546c32992f20524cb405c38))
* improve layout of the "url" tab panel ([a3eed14](https://github.com/nextstrain/nextclade/commit/a3eed147c679a2df8fa5b0d7ac0e7941209b060c))
* improve layout of the file info component ([407fcd7](https://github.com/nextstrain/nextclade/commit/407fcd7a1645eba0c899399e3a2c279284a4a2bc))
* improve layout of upload cards ([18a49c8](https://github.com/nextstrain/nextclade/commit/18a49c8d21982caffa736b627abff4f42175005a))
* improve network error messages ([08f3f5f](https://github.com/nextstrain/nextclade/commit/08f3f5ff809abda59242aa23b5c5c7740879ba79))
* improve uplolader text for case where data is provided as a string ([7f29bf4](https://github.com/nextstrain/nextclade/commit/7f29bf4ca2498fdf7cd57823819dd28b5a07200f))
* increase feature box height ([9777ae6](https://github.com/nextstrain/nextclade/commit/9777ae6752fcbf411668a2c98ac00fc5d336f804))
* increase file picker height ([1933511](https://github.com/nextstrain/nextclade/commit/1933511addf2c7d0a5cb8a794703099878c017ae))
* indicate file upload with status text ([c40a76d](https://github.com/nextstrain/nextclade/commit/c40a76de2ea2512ac7dbb8bb75d0ba14825ca5b2))
* launch algorithm on "Run" button click in advanced mode ([84afce2](https://github.com/nextstrain/nextclade/commit/84afce235d1c63c89e5f34d8a3e28a3a5c40c717))
* load and process files in advanced mode ([fbb106c](https://github.com/nextstrain/nextclade/commit/fbb106cbb736ccdc4d7b560e0869631fd4081360))
* make file pickers collapsible ([c51b4f8](https://github.com/nextstrain/nextclade/commit/c51b4f8c751dccb225c079fbe88647a38a07659f))
* reduce spacing between cards ([9a94b51](https://github.com/nextstrain/nextclade/commit/9a94b51f01ace1f6599d4ecbde2f12b96060518e))
* run automatically after example data is loaded ([d0c07d5](https://github.com/nextstrain/nextclade/commit/d0c07d57bbbbb8914c8eeeeacf1db65550517673))
* run immediately after input is provided in simple mode ([5d68c73](https://github.com/nextstrain/nextclade/commit/5d68c73dce97992099c80132a37589bb221db52d))
* show error alerts under file dialogs when there are errors ([6aa42be](https://github.com/nextstrain/nextclade/commit/6aa42be70c64d383778c2c3261c0928035ebbedb))
* soften card shadows ([b50d2ee](https://github.com/nextstrain/nextclade/commit/b50d2eebc53268e8a75869241045d5ebf0281f72))
* use new file picker in simple mode too ([9344d92](https://github.com/nextstrain/nextclade/commit/9344d923233956c37ea2ac1dfd4432dd27bf2149))
* wrap text in text area for pasting sequences ([73540c5](https://github.com/nextstrain/nextclade/commit/73540c5e5452c5c235f7833f8a2e02bc293daefd))



## [0.8.1](https://github.com/nextstrain/nextclade/compare/0.8.0...0.8.1) (2020-11-12)

This is a follow-up release, on top of version 0.8.0.

In this version Nextclade further improves handling of gaps in node distance calculation.

We increased the thresholds of private mutations in Quality Control calculation for SARS-CoV-2, to account for the current situation, so some sequences will have better QC scores now. As usual, you can set the desired custom values in Settings dialog or using the `--input-qc-config` flag in the command-line version.

Additionally, this version introduces some minor improvements in the user interface as well as in runtime performance.

You can find the full set of changes below:


### Bug Fixes

* formatting markdown snippets (about and changelog) ([b8b1971](https://github.com/nextstrain/nextclade/commit/b8b1971ebaf528c937b8cc458723362b8ac3a7ec))
* increase allowed private mutations -- as SARS-CoV-2 diversifies, sequences are expected to have more private mutations ([fc1e885](https://github.com/nextstrain/nextclade/commit/fc1e885863c417c33eaf7795df2b29011848d709))


### Features

* exclude gaps from private mutations counting ([5b04903](https://github.com/nextstrain/nextclade/commit/5b04903b21a279cf8094bf72b789f2fa440de9b5))
* only show the "what's new" popup on major branches ([a902c6a](https://github.com/nextstrain/nextclade/commit/a902c6ac7b68a3ccf767e4059fe50db4c32bc79f))


### Performance Improvements

* avoid re-filtering gaps from mutations for every node every time ([0509770](https://github.com/nextstrain/nextclade/commit/0509770f1a95b2d463449a2b7d4c8a83ceb04005))
* catch common cases in nucleotide match function before doing full set intersection ([20a20ae](https://github.com/nextstrain/nextclade/commit/20a20ae8022f8d340f397b0fd4087a455117e9b3))


# [0.8.0](https://github.com/nextstrain/nextclade/compare/0.7.8...0.8.0) (2020-11-10)

This release brings several important bugfixes, improvements and new features.

In this version Nextclade adds support for the new SARS-CoV-2 regional subclades. The default reference tree now contains a few nodes with clades `20A.EU1` and `20A.EU2`. For more information about the new variants refer to [Hodcroft et al., 2020](https://www.medrxiv.org/content/10.1101/2020.10.25.20219063v1).

Nextclade algorithms now handle ambiguous nucleotides and gaps in the reference tree and the root sequence. Previously this was not needed, because our default root sequence is always full and unambiguous, but this is important now that Nextclade allows custom root sequences.

Nextclade developers will no longer maintain `clades.json` file with a list of clades. Since v0.4.0, clade assignment is performed by taking clade of the nearest node on the reference tree, so the algorithm does not depend on this file. This change means that users no longer have to provide `clades.json` for custom viruses anymore, but also that the "Gene map" panel in the web application will not show markers for clade-defining mutations.

Nextclade web app now includes more interesting and relevant example SARS-CoV-2 sequences to better showcase application's features.

Nextclade web application now accepts new URL parameters. Additionally to `input-fasta=` parameter to download and start processing a given FASTA file (introduced in v0.7.0), you can now also provide `input-root-seq=` parameter to download and use a given custom root sequence, as well as `input-tree=` parameter for a custom reference tree.

You can now export the resulting tree in Auspice JSON v2 format, with the analyzed sequences placed onto the reference tree. Check the "Export" dropdown on the results page. This file can then be used for further analysis or visualization (for example with [auspice.us](https://auspice.us)).

> ⚠️ Exercise caution when interpreting Auspice JSON v2 file generated by Nextclade. Nextclade's algorithms are only meant for quick assessment of sequences: they perform quality control, clade assignment, and a simple phylogenetic placement. Nextclade is not a replacement for the full phylogenetic analysis with the main Nextstrain pipeline.

The non-algorithm part of the command-line version of Nextclade has been substantially rewritten. It now takes advantage of all processor cores in the system. You can set the desired level of parallelism with the new flag: `--jobs`. Additionally, sequences that trigger processing errors are now included into CSV, TSV and JSON output files, along with their respective error messages (in the new `errors` column).

The redundant column `qc.seqName` has been removed from CSV and TSV results. Use column `seqName` instead. The order of columns has been changed, to emphasize clades and QC results.

There are more minor fixes and improvements. Here is a full list of changes since previous release:

### Bug Fixes

* ensure auspice strings interpolate correctly ([1f0e3c1](https://github.com/nextstrain/nextclade/commit/1f0e3c119a6528c07ea32f19273b3919891ca8a3))
* remove black overlay above entropy panel when holding shift or alt ([fbc851c](https://github.com/nextstrain/nextclade/commit/fbc851c4d330bda997a0c9fd3fd36c1764a1f424))
* ensure isMatch handles ambiguous nucleotides in both reference and query ([ee35f77](https://github.com/nextstrain/nextclade/commit/ee35f7717d51b4ed70aa20adcf31e62fb17a9ea9))
* exclude gaps in reference node from distance calculations ([8e6571c](https://github.com/nextstrain/nextclade/commit/8e6571c331e7c277dfba47e757e4b42ee4f2acfe))
* use consistent line endings in json export ([3d8ddb5](https://github.com/nextstrain/nextclade/commit/3d8ddb537dd2fb516e99924165eed8ed2fbd74dc))
* ensure isMatch handles ambiguous nucleotides in both reference and query ([ee35f77](https://github.com/nextstrain/nextclade/commit/ee35f7717d51b4ed70aa20adcf31e62fb17a9ea9))
* exclude gaps in reference node from distance calculations ([8e6571c](https://github.com/nextstrain/nextclade/commit/8e6571c331e7c277dfba47e757e4b42ee4f2acfe))
* **cli:** add missing files into docker builds ([dbb54f2](https://github.com/nextstrain/nextclade/commit/dbb54f2a8584379437932d7480cc08db34d16a87))
* **cli:** preserve failed sequences in results ([8e1e78b](https://github.com/nextstrain/nextclade/commit/8e1e78b170242e72b97e3e75ce67856ad9f32c28))

### Features

* **cli:** add jobs flag for setting the level of parallelism ([96100b6](https://github.com/nextstrain/nextclade/commit/96100b6063880c69630ef7019a3d4223aaf63379))
* **cli:** don't finalize tree when tree output is not requested ([8a9c767](https://github.com/nextstrain/nextclade/commit/8a9c767e6f39270ee4d24fc3c2445deae895dd3e))
* **cli:** make CLI run in parallel   ([5a8902c](https://github.com/nextstrain/nextclade/commit/5a8902c1248d2aec9851e9d27ea59790d9eb4af9))
* add "what's new" popup, optionally show on every release ([66cf03d](https://github.com/nextstrain/nextclade/commit/66cf03d59f83981b198a064ae510650cc37d4a83))
* allow exporting Auspice tree json result again ([5428bc8](https://github.com/nextstrain/nextclade/commit/5428bc8054a3f8cd78729a307b5dfadda4e0474b))
* enforce csv column order, remove duplicate qc.seqName column ([5928b53](https://github.com/nextstrain/nextclade/commit/5928b53cc0d8d74fa3e438d91d958b54d1dd1fee))
* feat!: remove clade markers from Gene Map, remove clades.json ([858b92a](https://github.com/nextstrain/nextclade/commit/858b92a7558e0ff7b9c7119cc34250f4ea829b85))
* feat: add more interesting example data
* feat: add rule to augur workflow to make example sequence fasta
* feat: add subclades
* fetch input root sequence and input ref tree provided  URL params ([585371a](https://github.com/nextstrain/nextclade/commit/585371a1e397bc15e7802d8e6a4e2edaa5777da9))
* remove uppercase text transform from buttons  ([79c99b6](https://github.com/nextstrain/nextclade/commit/79c99b666077b11b31fd155518c36e6a0e98b4c5))
* use the root sequence and tree provided in the URL ([d364efa](https://github.com/nextstrain/nextclade/commit/d364efa1936967e345d04ad917f600fca9ecabee))

### BREAKING CHANGES

* We removed `clades.json` file and modified `Virus` data structure.
  For a while now we assign clades by looking at the closest node in the tree, and we don't rely algorithmically on clade definitions in `clades.json`. The only place where clade definitions were used is displaying clade-defining mutation markers on Gene Map.
  We agreed that with introduction of subclades we want to remove `clades.json`, rather than update it. It also means removing clade-defining mutation markers on Gene Map in the web app. This commit makes this happen.
* qc.seqName is removed from CSV, TSV and JSON outputs (it had the same values as seqName)
* order of columns is changed in CSV ans TSV outputs


## [0.7.8](https://github.com/nextstrain/nextclade/compare/0.7.7...0.7.8) (2020-11-05)

This is a bugfix release which addresses CLI crash due to improper reading of the custom gene maps

### Bug Fixes

* **cli:** add missing preprocessing step for custom gene maps in CLI ([0fb31dd](https://github.com/nextstrain/nextclade/commit/0fb31dd02e44460460c3565e32391aafbc1a7fcc)), closes [#252](https://github.com/nextstrain/nextclade/issues/252)


## [0.7.7](https://github.com/nextstrain/nextclade/compare/0.7.6...0.7.7)

This is a bugfix release which addresses a rarely occurring situation when clade is incorrectly assigned due to a defect in the clade assignment algorithm.


### Bug Fixes

* remove mutually cancelling mutations during tree preprocessing ([a420e83](https://github.com/nextstrain/nextclade/commit/a420e8373a05af1f74e2f073ae83c4577dd65510))


## [0.7.6](https://github.com/nextstrain/nextclade/compare/0.7.5...0.7.6) (2020-10-27)

This is a bugfix release which addresses crash of the web application which occurred when removing a tree filter by clicking on a "cross" icon of the filter badge.

Additionally, we decided tp force reset all users' browsers to use English version of the Nextclade web application, because other locales went out of sync significantly. P.S. We are [looking for translators](https://github.com/nextstrain/nextclade/issues/37)!

### Bug Fixes

* avoid crash on filter badge removal ([472b9ab](https://github.com/nextstrain/nextclade/commit/472b9ab2c9bf5e7e83621c0046e331d3e9d5cebb)), closes [#235](https://github.com/nextstrain/nextclade/issues/235)

### Features

* force reset all users to English locale ([762d34d](https://github.com/nextstrain/nextclade/commit/762d34de89c27e8b867ad34f55154d87503cd4ae))


## [0.7.5](https://github.com/nextstrain/nextclade/compare/0.7.4...0.7.5) (2020-10-06)


This release removes nucleotide composition from CSV and TSV outputs. Due to variations of the alphabet, nucleotide composition has been adding and removing columns unpredictably. By removing it we opt-in to a stable set of columns.

### Features

* don't output nucleotide composition to CSV ([ff7c883](https://github.com/nextstrain/nextclade/commit/ff7c883ad4125f688db949121e5c645cc3ba877c))



## [0.7.4](https://github.com/nextstrain/nextclade/compare/0.7.3...0.7.4) (2020-10-05)

This is a bugfix release which addresses improperly formatted SNP clusters in output files

### Bug Fixes

* format SNP clusters properly for export ([c7aa5c7](https://github.com/nextstrain/nextclade/commit/c7aa5c7c81b9a9fb9cb072aa8e704b0a0a019991))



## [0.7.3](https://github.com/nextstrain/nextclade/compare/0.7.2...0.7.3) (2020-10-05)

This is a bugfix release

### Bug Fixes

* add last newline in exports ([c3d83d6](https://github.com/nextstrain/nextclade/commit/c3d83d6da3a4c272fa76326359451327c674dab5))
* prevent app from crashing when a locale is missing ([1fd2a19](https://github.com/nextstrain/nextclade/commit/1fd2a19e41fa8f5cf563da04afcbb1dcbc921b75))



## [0.7.2](https://github.com/nextstrain/nextclade/compare/0.7.1...0.7.2) (2020-10-01)

This version introduces a mechanism that allows Nexclade to signal common ad blocking browser extensions that it respects privacy. We hope that it may increase compatibility when these extensions are enabled.


### Features

* attempt to reduce breakage by adblockers ([1870cdc](https://github.com/nextstrain/nextclade/commit/1870cdc2667a58e496f9d182173af5c5770ed6bd))
* warn about possible adblocker interference ([ffff5fb](https://github.com/nextstrain/nextclade/commit/ffff5fb41fc5b5967270a3dcdee8058acc9e692e))



# [0.7.0](https://github.com/nextstrain/nextclade/compare/0.6.0...0.7.0) (2020-10-01)

Nextclade 0.7.0 ships with new CLI flags, allowing overriding most of the virus-specific parameters:

```
--input-fasta
--input-root-seq
--input-tree
--input-qc-config
--input-gene-map
--input-pcr-primers
```

Additionally, the web application now can fetch a .fasta file from a remote location using `input-fasta` query parameter:
`https://clades.nextstrain.org/?input-fasta=<your_url>` (CORS needs to be enabled on your server)


### Bug Fixes

* ensure example sequences are loading correctly ([fc44961](https://github.com/nextstrain/nextclade/commit/fc449615bcfa84551912434671a724ef30caa94f))


### Features

* improve network error popup informativeness and looks ([ffd2995](https://github.com/nextstrain/nextclade/commit/ffd29954b9a3761a7e0eb6263436254c129dc0d5))
* **cli:** add CLI flag to output a CSV with clades only ([bb405ff](https://github.com/nextstrain/nextclade/commit/bb405ffccdd50a09e43c148ab592c8d21f95e5ed))
* **cli:** add possibility to override clades, primers and gene map ([643607b](https://github.com/nextstrain/nextclade/commit/643607b2a435a93267479251dbb5da086bbb48fa))
* **cli:** output a TSV with clades only, instead of CSV ([d956f0b](https://github.com/nextstrain/nextclade/commit/d956f0bbae2be6a4e35d21f091f3e45851b524a6))
* deduce virus genome size from root sequence length ([22d4e7a](https://github.com/nextstrain/nextclade/commit/22d4e7a76db63a85b5cbe43efb18de7f3e52edd0))



# [0.6.0](https://github.com/nextstrain/nextclade/compare/0.5.2...0.6.0) (2020-09-24)

This a bugfix release which addresses CLI crash on alignment failure

### Bug Fixes

* fix CLI crash on alignment failure ([b02a602](https://github.com/nextstrain/nextclade/commit/b02a602615486d2f3725ed873cae65bea30b4b7b))



## [0.5.2](https://github.com/nextstrain/nextclade/compare/0.5.1...0.5.2) (2020-09-23)


### Bug Fixes

* correct the link URL to nextstrain ncov clades ([92982c7](https://github.com/nextstrain/nextclade/commit/92982c75015ff21df036390aef16f2b6788c9e4e))



## [0.5.1](https://github.com/nextstrain/nextclade/compare/0.5.0...0.5.1) (2020-09-23)


### Features

* fetch input fasta from a remote location ([a339c05](https://github.com/nextstrain/nextclade/commit/a339c05cd0c67ef64cf231c8b41291cbf85fc8b1))
* present error message on data fetch failure ([aed0a21](https://github.com/nextstrain/nextclade/commit/aed0a215c8d69b316a705c29057de427d77f7c6d))



# [0.5.0](https://github.com/nextstrain/nextclade/compare/0.4.8...0.5.0) (2020-09-21)


### Bug Fixes

* ensure proper complement and position of ambiguous nucleotides ([8de7f5d](https://github.com/nextstrain/nextclade/commit/8de7f5d3ec3259a246661505bd56ff2960599ede))
* remove Charité_NS_RdRp_P primer, correct name of Charité_N_RdRp_P ([488bf05](https://github.com/nextstrain/nextclade/commit/488bf05dbcd194f0a2b6f760e6790710da01a487))
* remove trailing spaces from primer sources ([8dce5c6](https://github.com/nextstrain/nextclade/commit/8dce5c6b9fa5c896592103a90a9c4769e4010bc6))


### Features

* add primer changes to the tree node info ([eb51963](https://github.com/nextstrain/nextclade/commit/eb5196306cb1c8a333308898cbe3546054e42864))
* add tree coloring by presence of PCR primers ([21dceed](https://github.com/nextstrain/nextclade/commit/21dceed07d421d9dac771c16490307b78f96ecea))
* convert primer data to JSON ([36bbd6e](https://github.com/nextstrain/nextclade/commit/36bbd6ec61fe8610be8b15bf4e9bb4a41c448757))
* display PCR primer changes in tooltips ([801622f](https://github.com/nextstrain/nextclade/commit/801622f66feb133e1440fa365a3d87b14ee27895))
* don't report mutations where primer contains ambiguous nucleotides ([7fc5383](https://github.com/nextstrain/nextclade/commit/7fc538368a582c149a6f4a92afeed0af69f58adf))
* format PCR primer changes when preparing CSV export ([b9019c5](https://github.com/nextstrain/nextclade/commit/b9019c5014d276e61cf63ab2fd2f044a9d15442b))
* list primer changes in mutation tooltips on sequence view ([98e0189](https://github.com/nextstrain/nextclade/commit/98e0189b0089fa44cd12355e81aae14a7d8e9353))
* retry with reverse-complement primer if not found in root sequence ([8a7a458](https://github.com/nextstrain/nextclade/commit/8a7a45836f1f515b6368687c53039634c17e40e9))


## [0.4.6](https://github.com/nextstrain/nextclade/compare/0.4.5...0.4.6) (2020-09-14)


### Bug Fixes

* attempt to fix tsv extension on chrome mac ([e47aa5e](https://github.com/nextstrain/nextclade/commit/e47aa5e7026f86554157d1e4030ce8b5a29306b3))
* **cli:** make sure the custom tree is used ([d32d7c2](https://github.com/nextstrain/nextclade/commit/d32d7c28fb852377564df7b4b3cbfb7b8a881808))
* make sure exported files have correct extensions ([2bb74c8](https://github.com/nextstrain/nextclade/commit/2bb74c8ed0398cd0bc59bb88e779976a1f30452c))
* **cli:** make desc casing consistent ([976a47d](https://github.com/nextstrain/nextclade/commit/976a47d990d17fb8f0b311c39f52593944d05f85))
* change app description to match the main page title ([43daceb](https://github.com/nextstrain/nextclade/commit/43daceb04d1d81188e313ff326c99576d65f4b53))
* correct substitutions in translated strings ([fa2120a](https://github.com/nextstrain/nextclade/commit/fa2120a01905320c8e31749c2e73912347ae26e7))
* ensure saved locale is restored on launch ([86c1688](https://github.com/nextstrain/nextclade/commit/86c168855ef45a8359f293b466ef7c1ffbe54104))


### Features

* **cli:** add ability to output Auspice JSON v2 in CLI ([77563a3](https://github.com/nextstrain/nextclade/commit/77563a3e087e42b599eb7f42a6486f146e5332f8))
* add basic node cli ([1eeef0c](https://github.com/nextstrain/nextclade/commit/1eeef0c97f93e29f6ae75901458b3576097bb77f))
* add cli arguments for inputs and outputs ([db8c44e](https://github.com/nextstrain/nextclade/commit/db8c44e6aade356b7ab8ab69db3e8db88eff4524))
* add docker container config ([8ea7047](https://github.com/nextstrain/nextclade/commit/8ea704785ea6a72080c61dd3e8a5bc304fe97d6a))
* add links to cli and a short intro on main page ([4a724d9](https://github.com/nextstrain/nextclade/commit/4a724d9942e587d49996723ba655a36b033cd46b))
* **cli:** allow custom root sequence, qc config and ref tree ([da5824a](https://github.com/nextstrain/nextclade/commit/da5824a2ff22a504f2e7ee9ee98d02e40fdec60a))
* improve fr translation ([243bcbf](https://github.com/nextstrain/nextclade/commit/243bcbfeb03a00e98e1a66bd146943c9f1d4f71b))
* improve ru translation ([64aff1a](https://github.com/nextstrain/nextclade/commit/64aff1a9839f70d1fb9f9532d77a42ad4d9b3b00))
* remove unused locale keys ([82bd7ba](https://github.com/nextstrain/nextclade/commit/82bd7ba52c0af1c91aa673b4712064af2ab819f9))



# [0.4.0](https://github.com/nextstrain/nextclade/compare/0.3.7...0.4.0) (2020-09-01)


### Bug Fixes

* add missing word ([f15af21](https://github.com/nextstrain/nextclade/commit/f15af2187c4bed93839e2412349f3358809ec73a))
* adjust QC filter to new scoring scheme ([4129947](https://github.com/nextstrain/nextclade/commit/4129947ad55e5319c63d5058228eb873f7ddd30b))
* adjust reducers, ui and more types for the new results layout ([8520daf](https://github.com/nextstrain/nextclade/commit/8520dafff1abc4fdba76a654e3bf77547644d2a5))
* avoid unrecoverable failure when a sequence fails to align ([1511d7b](https://github.com/nextstrain/nextclade/commit/1511d7b512d0ae3e97850ed9bf8b748ef3ae6b0a))
* disable "show tree" button until full results are available ([283dc9e](https://github.com/nextstrain/nextclade/commit/283dc9e5116eb2887f965e86b7c757f1b7424f8b))
* don't show settings dialog by default ([627a5ae](https://github.com/nextstrain/nextclade/commit/627a5ae223fed0540a2b614344b3c4c55f9978c9))
* ensure progress bar retains failure state until the end of the run ([796eddf](https://github.com/nextstrain/nextclade/commit/796eddf00aecc994f1d5181c0f358d2cf2468c1e))
* fix incorrect QC status assignment ([aff806b](https://github.com/nextstrain/nextclade/commit/aff806bdcbc2793f69670bf497f354e12f49c1d3))
* fix more type errors ([70fd82a](https://github.com/nextstrain/nextclade/commit/70fd82a91eb4a620d191845b73e6b29f2028c0cd))
* fix text color on OK button ([f8b139d](https://github.com/nextstrain/nextclade/commit/f8b139dcd84a37ccb51a113ffc3c4ea4f2a3ac96))
* fix type errors ([2108b28](https://github.com/nextstrain/nextclade/commit/2108b2837f0325c06c10c10739a9a24618f3e812))
* fix typos ([cebcdb3](https://github.com/nextstrain/nextclade/commit/cebcdb322618b46d76e0e915133d920e53e105bf))
* flip erroneous comparison ([fe2446b](https://github.com/nextstrain/nextclade/commit/fe2446b9bc8505b2b21620214559ae3fea1c1df3))
* make sure QC strings on tree nodes are being translated ([7c9c96d](https://github.com/nextstrain/nextclade/commit/7c9c96d330d38f1b0fb0a79450cad3bf1f46bc03))
* make sure to format non-ACGTN ranges for export ([75abfc3](https://github.com/nextstrain/nextclade/commit/75abfc3f94ebf00179723e2d5c55d3faef203b38))
* make sure tooltips are attached to the right element ([2bccf84](https://github.com/nextstrain/nextclade/commit/2bccf840769cace36580ba8cb65466030310c1a6))
* make sure tree nodes are properly colored on first tree render ([56662fe](https://github.com/nextstrain/nextclade/commit/56662fefdf0aedaa1ff399ed81c9bf9f1390d189))
* make sure we find divergent mutations correctly ([6b7be19](https://github.com/nextstrain/nextclade/commit/6b7be19d7612e06dcec3a9dba270062b2c1fa72c))
* make text casing consistent ([6de96d2](https://github.com/nextstrain/nextclade/commit/6de96d28f19e384cb2302421122641a6a600561f))
* prevent text from selection on QC status icons ([bd2fb9f](https://github.com/nextstrain/nextclade/commit/bd2fb9fbc92f8b4140593f209f520c3bba481ecd))
* **dev:** fix type error and tests ([ea2fef4](https://github.com/nextstrain/nextclade/commit/ea2fef4e889bc61986974670b6c3b1da23dce571))
* remove stray brace ([272a44f](https://github.com/nextstrain/nextclade/commit/272a44f1c6f9102db05b53ac4dbb80bc390a0ce1))
* remove unused package ([23c8e82](https://github.com/nextstrain/nextclade/commit/23c8e82c57f1815c74b90125c715d8384d1bfdc0))
* type errors in QC runner ([ab4d34c](https://github.com/nextstrain/nextclade/commit/ab4d34ca6734042dadc5cdf843365fc92d9cfd8a))


### Features

* add "phylogenetic placement" feature box, adjust main page styling ([45f01fa](https://github.com/nextstrain/nextclade/commit/45f01fa0b3547b91c9d5bc3fc111f32ab5a34ed4))
* add button to rerun the algorithm ([a4dbcba](https://github.com/nextstrain/nextclade/commit/a4dbcbac6bbe7ec99055cfc46a4fda4c55816151))
* add intermediate QC level ([46fd02f](https://github.com/nextstrain/nextclade/commit/46fd02f191d69ecfe1055c22bcf49885d7dc0df6))
* add new QC text to the auspice tree ([641ef02](https://github.com/nextstrain/nextclade/commit/641ef02c49679815d4ec32743b2b473faa3f403a))
* add reversion mutations to the terminalMutations, rename function ([f2dc7c2](https://github.com/nextstrain/nextclade/commit/f2dc7c275380f76230d946816728db36f891dbd8))
* adjust exports for new data layout, remove auspice json export ([05a9409](https://github.com/nextstrain/nextclade/commit/05a940935637c942a09dd298b46e1f025edc5b00))
* adjust progress bar for new algorithms ([1a15c4c](https://github.com/nextstrain/nextclade/commit/1a15c4cdf8fd30e3ff170b11b371318029d2a0d3))
* adjust progress bar to better reflect recent algorithm changes ([0562dfa](https://github.com/nextstrain/nextclade/commit/0562dfa899074d9d01818440524164c6925fb04e))
* adjust progress indicator for the new state and event flow ([3f3839b](https://github.com/nextstrain/nextclade/commit/3f3839b49e8d7c09da6802e854dbae39bec2d2f8))
* adjust results table for the new state and event flow ([3d0c835](https://github.com/nextstrain/nextclade/commit/3d0c8358f22183412f2cce8e1ad2ceeda1a4f803))
* adjust sorting and filtering for the new QC categories ([7a1d68c](https://github.com/nextstrain/nextclade/commit/7a1d68c61a8e85072714d3f1eb361266cde5a7fc))
* adjust sorting for the new QC results ([638750d](https://github.com/nextstrain/nextclade/commit/638750dcb53c19e11e0cb2d867ca834b70e51bd1))
* assign clade from nearest node in reference tree ([d23d5e1](https://github.com/nextstrain/nextclade/commit/d23d5e1000e4d91be6d83727d89a1e82bd9123dc))
* change privateMutation rule to affine linear excess ([98c71d6](https://github.com/nextstrain/nextclade/commit/98c71d6452b212755621a21c4f4f19b2094407fb))
* change QC icon labels ([dba62b6](https://github.com/nextstrain/nextclade/commit/dba62b687e81aa2de37ae4da0e012c5881ae3501))
* combine scores quadratically such that two scores of 70 trigger a warning, or one score of 100 ([c543cee](https://github.com/nextstrain/nextclade/commit/c543cee6c78d9c4d8164d12bb288119270ce6bf7))
* display status for every QC rule as colored circles ([637a095](https://github.com/nextstrain/nextclade/commit/637a095bd0f4d3804e2bb3cfbcd689a31e326e4c))
* expose QC config in the UI ([7fc5881](https://github.com/nextstrain/nextclade/commit/7fc5881a86740c760bc53332c512a7b88b446fa4))
* format QC tooltip based on new results  ([ba412bb](https://github.com/nextstrain/nextclade/commit/ba412bbaf7f1deac4249cb60bc78c51ab9953699))
* hide passed QC checks from tooltip ([07f92e3](https://github.com/nextstrain/nextclade/commit/07f92e35bb13b6e84e2e82b26b7507457354c1a9))
* highlight rows with issues ([ba3e2ed](https://github.com/nextstrain/nextclade/commit/ba3e2edc9c1607dcf04c8c8caefc327315d6c4ff))
* improve QC tooltips, improve layout of large tooltips ([7716b14](https://github.com/nextstrain/nextclade/commit/7716b149db77ac1b3a9a92030170dbcd6fa50969))
* improve string formatting of insertions ([c0863e2](https://github.com/nextstrain/nextclade/commit/c0863e2dd1ed767993fa0e4bb90743b405244e43))
* list QC rules in the same order ([1ad2738](https://github.com/nextstrain/nextclade/commit/1ad2738bde220cd512b88dcaeb677ce7c44f1a85))
* make QC status coloring more consistent ([b17b33f](https://github.com/nextstrain/nextclade/commit/b17b33f00352a37d057ef3bddeaf017ab5b2a4f0))
* make QC status icons' labels more distinct, single-letter ([4350c28](https://github.com/nextstrain/nextclade/commit/4350c28aa704f9ef2107fe9df6a5f23935d74ae1))
* pass mutations difference from reference node to QC ([48415c1](https://github.com/nextstrain/nextclade/commit/48415c1ae995624734485b5c2dab394c15dbdd14))
* prettify QC status circles ([ad61a15](https://github.com/nextstrain/nextclade/commit/ad61a15845cc36b920f6f0749678bcf6ae280524))
* reduce weight of missing data check ([575aa05](https://github.com/nextstrain/nextclade/commit/575aa05bd8fbf5a262d6eb6c895786ae702e59aa))
* rename variables to clarify intent ([389dd79](https://github.com/nextstrain/nextclade/commit/389dd799832ecaf93a9c6b29d56ec9d65079f7ba))
* restyle buttons on results page, adjust for smaller screens ([5a4e806](https://github.com/nextstrain/nextclade/commit/5a4e80698f7a8420d244658be2e2fc5f5d8eeac9))
* round QC scores in UI ([99aaabe](https://github.com/nextstrain/nextclade/commit/99aaabeb2245ffd48167b59c6b18fd0a9782ced4))
* show per-rule QC icons in tooltips ([4c45584](https://github.com/nextstrain/nextclade/commit/4c45584ba3267498b844d6c2d4abc3b261ae2575))
* simplify QC message for mixed sites ([a8228a8](https://github.com/nextstrain/nextclade/commit/a8228a84a2d84a41c5b8dc5f9bf99f13c5999a8c))
* soften QC status icon colors ([cadae7e](https://github.com/nextstrain/nextclade/commit/cadae7e67a5e76f6068ea6240f6a4a258fbc8f42))
* use new QC status on tree nodes ([423d459](https://github.com/nextstrain/nextclade/commit/423d45991b95f035681b700e5c51b68a2d195720))
* **dev:** implement better error handling in algorithm saga ([49c50c2](https://github.com/nextstrain/nextclade/commit/49c50c2ed21ab5e13c14f2ef81faa8deb388fd1a))
* **dev:** improve runtime performance profiling ([538e82e](https://github.com/nextstrain/nextclade/commit/538e82e5924057f1e4b3419718add726cc0d586d))
* **dev:** setup runtime performance profiling ([dd12d48](https://github.com/nextstrain/nextclade/commit/dd12d485d3ac5dd98353de07fa66a9c40082d96f))
* subtract thresholds when calculating QC scores ([7f5013b](https://github.com/nextstrain/nextclade/commit/7f5013b54069f91f63edd76174ee08be4c15ebef))
* tweak MissingData QC rule to return values such that above 100 is problematic ([8d49eee](https://github.com/nextstrain/nextclade/commit/8d49eee96e94fa29430f7ae5da90b58a7c968e74))
* tweak parameters of QC rules. remove unused config values ([b78b143](https://github.com/nextstrain/nextclade/commit/b78b143f7d4b17af3db30cd772a09662474da1b6))


### Performance Improvements

* assign all QC results in bulk to avoid redux performance overhead ([dced28c](https://github.com/nextstrain/nextclade/commit/dced28c2ae6aeecf4c2f4c2539d3434965d9498c))
* assign clades in bulk to improve performance ([6ce4a2e](https://github.com/nextstrain/nextclade/commit/6ce4a2e2e0d23b3910b25dcbd59567c58897dbfc))
* make object cloning faster ([6940e9a](https://github.com/nextstrain/nextclade/commit/6940e9a7abcbc7c9c96578204c35f68d56540f6a))
* memoize a slow function ([92ba87c](https://github.com/nextstrain/nextclade/commit/92ba87c82907717fa7ef99b9e2887b5449da20f6))
* memoize slowest React components ([4f2969b](https://github.com/nextstrain/nextclade/commit/4f2969b321bf11fe04c0b25b5db6ad728ce91c5c))


### Reverts

* Revert "refactor: split tree preparation away from tree algorithm" ([2b3df69](https://github.com/nextstrain/nextclade/commit/2b3df69334c67ba826fc6f204a4a858ff056e78a))



## [0.3.7](https://github.com/nextstrain/nextclade/compare/0.3.6...0.3.7) (2020-08-28)


### Features

* add export to tsv ([0c4452a](https://github.com/nextstrain/nextclade/commit/0c4452ac231169b37e42b6439492ce87c3681e78))



## [0.3.6](https://github.com/nextstrain/nextclade/compare/0.3.5...0.3.6) (2020-08-18)


### Bug Fixes

* lint ([521594b](https://github.com/nextstrain/nextclade/commit/521594b17df7f2822152d61a7e25f7807bec8d4c))


### Features

* **dev:** visualize functions in redux devtools ([fa8fa54](https://github.com/nextstrain/nextclade/commit/fa8fa54aea6c163a4d0f7afd433c4ec2117eef00))
* add ability to disable filters temporarily ([a09521c](https://github.com/nextstrain/nextclade/commit/a09521c7faf966cdff808158266678a6a434df71))
* add auspice entropy widget ([96ad6f6](https://github.com/nextstrain/nextclade/commit/96ad6f63ac03d89ffb2ba17b02e4dfa1490dc790))
* make sure entropy chart renders properly, adjust page styling ([2eec5c9](https://github.com/nextstrain/nextclade/commit/2eec5c97d57b7d8fac0341e0e5ddffd4622f0771))



## [0.3.5](https://github.com/nextstrain/nextclade/compare/0.3.4...0.3.5) (2020-08-08)


### Bug Fixes

* fix type error ([f6cdad5](https://github.com/nextstrain/nextclade/commit/f6cdad54514fbfc773dfe06daa1b066859191173))



## [0.3.4](https://github.com/nextstrain/nextclade/compare/0.3.3...0.3.4) (2020-08-07)


### Features

* add node counts for every filter value and badge ([67c7cba](https://github.com/nextstrain/nextclade/commit/67c7cba9af917a2c3425e3f8599fe1d81f3b01bf))



## [0.3.3](https://github.com/nextstrain/nextclade/compare/0.3.2...0.3.3) (2020-08-06)


### Bug Fixes

* add missing color value in colorings ([116db0e](https://github.com/nextstrain/nextclade/commit/116db0e2c62c27638c70098e538aad3ebf8e4abd))
* ensure "Unknown" category is listed first ([67e100c](https://github.com/nextstrain/nextclade/commit/67e100c6b5c27e322c759af553ca3e231e07835f))
* fix incorrect import ([56e1274](https://github.com/nextstrain/nextclade/commit/56e1274eeb298660e14a68b46a646abf357dfda2))
* fix type error ([1b07220](https://github.com/nextstrain/nextclade/commit/1b072209e9212aedc9b6c88e63e8cb108596d012))
* lint ([5c9eab4](https://github.com/nextstrain/nextclade/commit/5c9eab4b942767b1319cf680ad65170bfbe8622e))
* lint ([1301184](https://github.com/nextstrain/nextclade/commit/1301184d7d2189e6b1e037c439a6a81a6ba8becb))
* rename variable to clarify the intent ([d318594](https://github.com/nextstrain/nextclade/commit/d318594d6fdd257fed40c93b602192fc1482dba2))


### Features

* add a foot note about the "Unknown" regions ([1d35ed2](https://github.com/nextstrain/nextclade/commit/1d35ed2e31ccd4b69a9232b9c4abd671a98e6600))
* add button to clear filters ([d7de823](https://github.com/nextstrain/nextclade/commit/d7de8232f0683935b7367ad09ee6c621abcc06d5))
* add clade and QC status tree filters ([2ca357c](https://github.com/nextstrain/nextclade/commit/2ca357c1591a6e2347fc429ca1c38054d99c1cb9))
* add clear button, disable autocomplete and spell check ([7e2c319](https://github.com/nextstrain/nextclade/commit/7e2c319a02c87892a343892f08cb44e48e5380a9))
* add colorings for "Unknown" regions ([abd366b](https://github.com/nextstrain/nextclade/commit/abd366b64c649276e50aef2750408333f6658ea7))
* add filtering actions ([3b5aa7b](https://github.com/nextstrain/nextclade/commit/3b5aa7b3faa262c9c8cb260c1555d0db0791aaa6))
* add node type tree filter ([bb35c35](https://github.com/nextstrain/nextclade/commit/bb35c35f9c24f87d4f1a0130fb81abf5b04b58a0))
* add region tree filters ([d2a809e](https://github.com/nextstrain/nextclade/commit/d2a809e7caf68fc6653a8897a9d7b297df107f8c))
* add version number in the main title ([cbb5518](https://github.com/nextstrain/nextclade/commit/cbb551856e7150250dfcae49056a779cbceff217))
* allow to remove filters by clicking a button on the badge ([6bed38a](https://github.com/nextstrain/nextclade/commit/6bed38a5bdf7c0141ff5b2e4511133d7b194c70b))
* allow to search for filtering criteria ([61b5a25](https://github.com/nextstrain/nextclade/commit/61b5a2598312e24388f57a43f490a99def501be1))
* assign new nodes to the "Unknown" region ([a04e0d5](https://github.com/nextstrain/nextclade/commit/a04e0d5641da977e071dc772c94ba530f522c0cd))
* disable clear filter button when there are no filters to clear ([4fbc5da](https://github.com/nextstrain/nextclade/commit/4fbc5da60eea7b30e7d8a0fd4d0315057feee062))
* display badges for filtering criteria ([a1b70ed](https://github.com/nextstrain/nextclade/commit/a1b70ed8a3438cc716fe8a9f023e07eeea6db13f))
* improve sizing and spacing of the filter panel elements ([c682c78](https://github.com/nextstrain/nextclade/commit/c682c7819bdaf312117559961f6384062093f6fa))
* make filtering badges bigger and brighter ([3cf8f5b](https://github.com/nextstrain/nextclade/commit/3cf8f5b05d66505d210d31e53f201656747989db))
* make order of filtering criteria consistent ([94ad967](https://github.com/nextstrain/nextclade/commit/94ad967466a380115cbbc64dd76e6e9730e7d59f))
* match background color with auspice sidebar ([68be816](https://github.com/nextstrain/nextclade/commit/68be8164c4d1b222fba7226ee9ecb173413b37ff))
* prettify filtering badges ([74f8714](https://github.com/nextstrain/nextclade/commit/74f871479622e358dc8b561a144685be6ae9958c))
* reduce margin ([4b12a75](https://github.com/nextstrain/nextclade/commit/4b12a759f799234bdbbe5887d3a74ed1023f464c))
* rename unknown value back to "Unknown " ([e6ce061](https://github.com/nextstrain/nextclade/commit/e6ce0610939095172ca37e4c63b59fd6fa3a38d7))



## [0.3.1](https://github.com/nextstrain/nextclade/compare/0.3.0...0.3.1) (2020-07-30)


### Bug Fixes

* add missing env vars for vercel ([62eaa01](https://github.com/nextstrain/nextclade/commit/62eaa014e5c63529768fabe8d524fa2d987a3d98))
* automate auspice monkey-patching ([d27a9c5](https://github.com/nextstrain/nextclade/commit/d27a9c56d12ce28b8a7c997d4f3cfac801ee2dab))
* avoid incorrect absolute imports ([66dcb4d](https://github.com/nextstrain/nextclade/commit/66dcb4d40c0209e50f35c357c44362fbe23c2f18))
* avoid redux error about non-existing `query` auspice reducer ([d6c141f](https://github.com/nextstrain/nextclade/commit/d6c141f0a8db663b197ab859dd317b6abe60fc0f))
* disable debug console messages for i18next ([56baa17](https://github.com/nextstrain/nextclade/commit/56baa174410e2670238c591039548a56347f6e27))
* don't call clade match if position isn't covered by the alignment ([045984f](https://github.com/nextstrain/nextclade/commit/045984f4ffc1aaf194819bd5c9d5c618112fd9b7))
* ensure absolute URLs in the SEO tags  ([88c1615](https://github.com/nextstrain/nextclade/commit/88c161548bdf4a04c2e6b2b58d4500fb1286ec30))
* ensure auspice tooltips are not empty ([c3f0ab3](https://github.com/nextstrain/nextclade/commit/c3f0ab33f705995703328c07fd3bae5b4d70e8bb))
* ensure translations are loaded properly ([7bca9de](https://github.com/nextstrain/nextclade/commit/7bca9dec2c9aacf3fc2a0439d5a0d2089c54d248))
* ensure vercel url has https schema ([462a76f](https://github.com/nextstrain/nextclade/commit/462a76f8fac21b56ccd4e807199a7606a4588cc5))
* ensure vercel url has https schema ([f1462f6](https://github.com/nextstrain/nextclade/commit/f1462f685c66c4cbfaf21ddef764c4aa887d4ab8))
* ensure zero positions don't trigger errors ([fda012e](https://github.com/nextstrain/nextclade/commit/fda012e60aabea2b12a6056ddfd4058ca4d63bf5))
* fix incorrect seo tag name ([8059e39](https://github.com/nextstrain/nextclade/commit/8059e392b143ebc06ad92eb5b5b231399cdb966b))
* fix object merging ([50e1761](https://github.com/nextstrain/nextclade/commit/50e17618709f75568f4e34dd889b6d29eb145e92))
* format ([638ee3a](https://github.com/nextstrain/nextclade/commit/638ee3a450afdb07944cbf55a2bc5af015828488))
* implement babel caller check as described in docs ([2cc4e5a](https://github.com/nextstrain/nextclade/commit/2cc4e5a9989e567087cf4c073190cc3fb6f13ca4))
* lint ([a04cb05](https://github.com/nextstrain/nextclade/commit/a04cb058618be14bde4485697c4c1a19c9627d00))
* lint ([25393fa](https://github.com/nextstrain/nextclade/commit/25393fa54e6ccb4e37d87b9c9485b528efe5c55b))
* lint ([640a6d5](https://github.com/nextstrain/nextclade/commit/640a6d595e9410d7831d8b57999001ef13c3a36f))
* lint ([074d4ed](https://github.com/nextstrain/nextclade/commit/074d4ed5a81b343f954a597a727fccc397788643))
* lint, fix type errors, cleanup ([e9ac5a0](https://github.com/nextstrain/nextclade/commit/e9ac5a02c00e6463e69079e0dd2a0732dda8079f))
* make parser robust to various line delimiters and unexpected characters ([7c000b2](https://github.com/nextstrain/nextclade/commit/7c000b2e89ba601553bded3021b8a5f131c72d24))
* make sure locateInTree() is reentrant ([3bd0698](https://github.com/nextstrain/nextclade/commit/3bd0698da9fa7a472614ea1bb40d58cb2f1f511e))
* patch auspice to remove more references to window ([8a50144](https://github.com/nextstrain/nextclade/commit/8a501440b10d7d31cdc06f44a19547c487b568fd))
* remove erroneous env var ([8541468](https://github.com/nextstrain/nextclade/commit/854146885f59c9fa1ebcaf872d04a41495089d5f))
* remove spaces in env files ([7d79926](https://github.com/nextstrain/nextclade/commit/7d799269f02fb7ee3487baba87dd3a639795dde8))
* remove unsupported syntax from babel config ([7fdb15f](https://github.com/nextstrain/nextclade/commit/7fdb15fbc6a63af02cc008704f457e92986ea03f))
* show sequences being analyzed again ([04b501c](https://github.com/nextstrain/nextclade/commit/04b501cd698af07b8e9ab597bb587436c54bf108))


### Features

* add "powered by auspice" logo on tree page ([294a2c2](https://github.com/nextstrain/nextclade/commit/294a2c22ef8f8f5d5b914ba7c1b7b8259c494b8f))
* add auspice reducers ([6482351](https://github.com/nextstrain/nextclade/commit/6482351452d9d736fee06f9504d6cc1e44f7bec6))
* add auspice sidebar ([71e1f56](https://github.com/nextstrain/nextclade/commit/71e1f5624b8a25394eb7cda3051b7a1e94ccc8b5))
* add button to show auspice tree ([234f5e5](https://github.com/nextstrain/nextclade/commit/234f5e5cfb2e7152878df6cbdc3f07dd25098a22))
* add google meta tags ([7cf4f63](https://github.com/nextstrain/nextclade/commit/7cf4f638834bc13e52d4a35eb91c964a1f6b7257))
* add help tips for results table column ([0257e44](https://github.com/nextstrain/nextclade/commit/0257e4469bedb75f65996e247219ed4fb3c522d3))
* add more data to tree node popup ([0e69173](https://github.com/nextstrain/nextclade/commit/0e69173cfb7b1843d513606b0682c299ee761018))
* add more meta tags for og and twitter ([0dc4f43](https://github.com/nextstrain/nextclade/commit/0dc4f4357a0c7feb5dcb1d97f588e9209b7bea04))
* add padding for top panel ([94b9d60](https://github.com/nextstrain/nextclade/commit/94b9d604ae7a13ac5dc51a0cd186fbc472b08b3c))
* add QC flags to the tree node popups ([5aed898](https://github.com/nextstrain/nextclade/commit/5aed8985a516f4ac09da462563124a4684fdb642))
* add redux thunk ([b74a1a2](https://github.com/nextstrain/nextclade/commit/b74a1a2f6b5fb4c38e09729a9c4b7868171a04bf))
* add redux-logger ([c2d7992](https://github.com/nextstrain/nextclade/commit/c2d7992cd685627c9ff1020cae4a28c01ac2c1d1))
* add styled-components theme ([8d29882](https://github.com/nextstrain/nextclade/commit/8d2988216939a8fb3d487152872c97132ad2af05))
* add styled-components theme from auspice ([5ec57d1](https://github.com/nextstrain/nextclade/commit/5ec57d184fac84ff0fc35e55bc365b3a63d6b206))
* add twitter and facebook meta tags ([f5fca2a](https://github.com/nextstrain/nextclade/commit/f5fca2a0022a6e7dfbc75948c308c9b8b8a267fe))
* adjust legend's margin ([f71cc7b](https://github.com/nextstrain/nextclade/commit/f71cc7b6a4a5fff11b6da8652b2087b4aba0c38f))
* allow loading fake auspice state for development ([72733ad](https://github.com/nextstrain/nextclade/commit/72733adb1d8f0bc8e38534f07ee6c6c6db45cab7))
* attach new nodes to reference nodes only ([6dc7321](https://github.com/nextstrain/nextclade/commit/6dc7321ebb33e62284c4b9fb51b8df360c551fe7))
* autosize the tree ([2e1aad5](https://github.com/nextstrain/nextclade/commit/2e1aad5faa24ecbbc27c7ec50def4ab792f86bad))
* color tree nodes explicitly by QC status and type ([5a1f976](https://github.com/nextstrain/nextclade/commit/5a1f97659041d2efbf23cda5979eb0e6a58ede51))
* disable tree button until the analysis is done ([b09492e](https://github.com/nextstrain/nextclade/commit/b09492ee0dcf2c1819f7ade6637527c73ced7f25))
* display aminoacid mutations in auspice tree ([811ea79](https://github.com/nextstrain/nextclade/commit/811ea79d127342a4d9ffe1ed0e0325465922f237))
* import and build auspice as a part of webpack build ([9d75bae](https://github.com/nextstrain/nextclade/commit/9d75bae470b3322072dfcc05969ec048d54d19bd))
* improve visibility of nodes in QC coloring ([3ecd30f](https://github.com/nextstrain/nextclade/commit/3ecd30f37d1f2c9eaee9474fe7d197bcbd17bb0f))
* improve webmanifest ([3a6045e](https://github.com/nextstrain/nextclade/commit/3a6045e0a31b9360355a023de85dbfe0206429e5))
* include auspice translation bundles ([03791e8](https://github.com/nextstrain/nextclade/commit/03791e8c2d4bfb05d03288f77bb8a3e368954e4b))
* integrate auspice json generation into UI ([17d920c](https://github.com/nextstrain/nextclade/commit/17d920c48974a82dc0178a64fd0464626d554eb8))
* make closes nodes brighter, shorten node type text ([4deb988](https://github.com/nextstrain/nextclade/commit/4deb98802553c6f41c987743831d9febb22df13f))
* make help buttons larger ([504a63a](https://github.com/nextstrain/nextclade/commit/504a63aa6986edf0c4a29a030245c44c5a75ff49))
* make tree button more visible ([4f51b2a](https://github.com/nextstrain/nextclade/commit/4f51b2a33bf32a3acb824d2a46ed635e35cd7678))
* mark constants `as const` ([6ead3e5](https://github.com/nextstrain/nextclade/commit/6ead3e5af90d9d1d31faf59e465804ff4e2a5e00))
* move SEO tags into separate component, use react-helmet ([b220e97](https://github.com/nextstrain/nextclade/commit/b220e97c1a3f543eea228b63858117dc0bcbd07e))
* move some of the SEO tags to _document, for static rendering ([a35c820](https://github.com/nextstrain/nextclade/commit/a35c8209271b26ebb42d46c46b840f90161f0072))
* pass domain name to the client side ([9624955](https://github.com/nextstrain/nextclade/commit/96249556644ab103e90ed1b57ad378a3f5cbc0a4))
* port locate_in_tree.py to typescript ([7c6c164](https://github.com/nextstrain/nextclade/commit/7c6c16453b6b8afbf9e4f391525fe97c861873a7))
* prerender styled-components stylesheets ([d88a9cf](https://github.com/nextstrain/nextclade/commit/d88a9cf638702645477ac783b74766e921909a6c))
* prettify tree page ([e5a241e](https://github.com/nextstrain/nextclade/commit/e5a241efe3c7fb43e9777d4db481c4d1120e8682))
* prettify tree page and related components ([e8a15d9](https://github.com/nextstrain/nextclade/commit/e8a15d988105f7dba3167d20728bd636a3392eda))
* put custom coloring at the top of the dropdown list ([c1ed74b](https://github.com/nextstrain/nextclade/commit/c1ed74b206e1d314a160074153b56f2697e50627))
* reduce sidebar top spacing ([94fc062](https://github.com/nextstrain/nextclade/commit/94fc062a31359bd8fcf186da08e2fe621358222d))
* remove coloring of closest nodes on the tree ([fa5424e](https://github.com/nextstrain/nextclade/commit/fa5424e62107668ca3360c9aca3e2968db5a8db9))
* remove unused date and dataset choice widgets from auspice sidebar ([3235278](https://github.com/nextstrain/nextclade/commit/323527818277366674dc947bc2c61599d9ec17d0))
* remove unused getInitialProps to allow static prerendering ([df30618](https://github.com/nextstrain/nextclade/commit/df30618fc6efcd71a9edbc4259cb524d86195011))
* render auspice tree ([fb2513f](https://github.com/nextstrain/nextclade/commit/fb2513f0472ff55348c7cff3ad8bdc599ddce432))
* use nexstrain logo spinner for loading page ([db21817](https://github.com/nextstrain/nextclade/commit/db21817bbd8da31f1eac014f2d96e8f945524a1b))



## [0.2.2](https://github.com/nextstrain/nextclade/compare/0.2.1...0.2.2) (2020-07-17)


### Bug Fixes

* remove console warning  ([23850fe](https://github.com/nextstrain/nextclade/commit/23850feb45f30b8c00355b0141dd6b6a2d5e7d51))



## [0.2.1](https://github.com/nextstrain/nextclade/compare/0.2.0...0.2.1) (2020-07-17)


### Bug Fixes

* adjust styling for breaking changes in react-file-icon v3 ([902f045](https://github.com/nextstrain/nextclade/commit/902f0451fa20c347bd340ffeef3cc5e86ba50adc))
* bring back regenerator-runtime in workers ([eec18b2](https://github.com/nextstrain/nextclade/commit/eec18b2997d64855db6f8b19b846c59adf4e0733))
* ensure filtered results are updated when results are updated ([39d6601](https://github.com/nextstrain/nextclade/commit/39d660197454cb77d4e7f4089b7eed84ed1656b7))
* fix negative width in  svg viewbox ([b32a4f6](https://github.com/nextstrain/nextclade/commit/b32a4f6c5c670ed61e9795f81ac407e19753e57a))
* format ([9727f63](https://github.com/nextstrain/nextclade/commit/9727f63ae1a263b468e2efb5b3e31a4e6c908a5b))
* hide filtering panel by default ([0991119](https://github.com/nextstrain/nextclade/commit/0991119fdbbe0f5420a68f24f8cce96c542d1cc6))
* lint ([5f0c2a1](https://github.com/nextstrain/nextclade/commit/5f0c2a1a4f6d3afd685d07c1d39f6a676ab21a3d))
* lint ([d9e8707](https://github.com/nextstrain/nextclade/commit/d9e87076cca1fc52b185dc7e22bb486d42d6bad0))
* lint ([fa6242a](https://github.com/nextstrain/nextclade/commit/fa6242af17f666b9ca1932e9c690ca32d18b6f17))
* lint ([28020ea](https://github.com/nextstrain/nextclade/commit/28020eaaf40d947f676c8b21cebd44e3b697f97e))
* make parser robust to various line delimiters and unexpected characters ([afbcfd6](https://github.com/nextstrain/nextclade/commit/afbcfd6bf740db1502af3b17b440e64ff0ccc9a6))
* make sure gene map tooltip appears reliably ([19ec421](https://github.com/nextstrain/nextclade/commit/19ec421d6c46a917623204596678b192006dc3e2))
* make sure the icon in dev alert is not overlapped by text ([5755956](https://github.com/nextstrain/nextclade/commit/57559568d62ddd118edba2ab2c437fbe377b1dd6))
* only match the last clade in the array of clades when filtering ([0a3c0ad](https://github.com/nextstrain/nextclade/commit/0a3c0ad82d8dad238e2f7a4a372d22bc5a6b13c0))
* packages/web/package.json & packages/web/yarn.lock to reduce vulnerabilities ([17c1e2b](https://github.com/nextstrain/nextclade/commit/17c1e2b2508e1aeaec257c80ff2d0577ff1410ed))
* prevent sequence text from wrapping ([1117cf3](https://github.com/nextstrain/nextclade/commit/1117cf34374fdf764fde9040b12efdcabb26489f))
* prevent vertical scrolling of navbar ([32fb39d](https://github.com/nextstrain/nextclade/commit/32fb39d9fcf6718ba1bac7456e013c95535a344f))
* remove unnecessary core-js import from workers ([bd9ec93](https://github.com/nextstrain/nextclade/commit/bd9ec935afbe4ffed483ab59f2c48765674c2085))
* reverse sort order ([75fd269](https://github.com/nextstrain/nextclade/commit/75fd269b55974452e4e73f24e38d11f38f88caf8))
* sort only sequences that makes sense to sort ([ccd6daf](https://github.com/nextstrain/nextclade/commit/ccd6daf41c1d8d469736a4f07f604e757a6a9101))
* typos ([fc80cc2](https://github.com/nextstrain/nextclade/commit/fc80cc2dced3a19d4e64ab43b483db3a5eae6d0d))


### Features

* add basic virtualization to the table ([b2e2d11](https://github.com/nextstrain/nextclade/commit/b2e2d114c8ec36ffe8a7ff0e1cb894da6aa99cb4))
* add filter dialog popups ([124ffe3](https://github.com/nextstrain/nextclade/commit/124ffe3d0955f8e6692afc2e65a0a1db59b40363))
* add filtering  by presence of QC issues and errors ([712de18](https://github.com/nextstrain/nextclade/commit/712de18903a100281ba79ff93c4d4cb2219815fd))
* add filtering by aminoacid changes - gene, ref, position, query ([77bbedf](https://github.com/nextstrain/nextclade/commit/77bbedf6c2f6d708fd98bdd514df068ab218652a))
* add filtering by aminoacid mutations ([3b7759f](https://github.com/nextstrain/nextclade/commit/3b7759f78ed1eda8906046c335a9b13ebabe922a))
* add filtering by clade ([6ee0b3b](https://github.com/nextstrain/nextclade/commit/6ee0b3bbd8741818a1613ee1712966f7519e9676))
* add filtering by nucleotide mutations ([98f2d4b](https://github.com/nextstrain/nextclade/commit/98f2d4b2676b92a180f8ce24d3a302ee932eccbe))
* add filtering by sequence name ([62cc172](https://github.com/nextstrain/nextclade/commit/62cc172b092e709f4bd35e44c1c9d87e7bc9d94c))
* add flexbox fixes for internet explorer ([e604b04](https://github.com/nextstrain/nextclade/commit/e604b0449faf3c0e8bcb16326d1f7669d4a6d88a))
* add id column to results table ([ea0994c](https://github.com/nextstrain/nextclade/commit/ea0994c9819140001c2b3dc8d91902da1ed82959))
* add logos ([f25e511](https://github.com/nextstrain/nextclade/commit/f25e511e6976350fecd7830b8637da21ee89d3ae))
* add more mutation syntax options ([937ac73](https://github.com/nextstrain/nextclade/commit/937ac73c7aa84717595ff8bab87942b7681db097))
* add mutation parser ([8e88955](https://github.com/nextstrain/nextclade/commit/8e88955b6a83d7e58c9b22d500e9be8d19ce715d))
* add polyfils ([add5dd6](https://github.com/nextstrain/nextclade/commit/add5dd61aca9510fc52286e79dad2a755e3a20bd))
* add sort by sequence name ([6f8721c](https://github.com/nextstrain/nextclade/commit/6f8721c4989b44d57714c7ceea470d8d078d7a25))
* add sorting for all categories ([5a2efc5](https://github.com/nextstrain/nextclade/commit/5a2efc5f18849181de5a184947d3e906ef3f5e22))
* add table border ([2e796ab](https://github.com/nextstrain/nextclade/commit/2e796abd1609018ec39e3d13456a784ede32c8c5))
* add table border and shadow for when rows don't fill the area ([73e092e](https://github.com/nextstrain/nextclade/commit/73e092e79dffb2da0bf1d03f65bb8f2c476ae1da))
* add transpiled modules whitelist ([115cdb1](https://github.com/nextstrain/nextclade/commit/115cdb1273e2041bab75248c6ddf58bbb5a91f77))
* adjust filter button style - layout, position, margins ([fa09ed5](https://github.com/nextstrain/nextclade/commit/fa09ed5cba4940812f0fe74792fd888bb2f19239))
* adjust gene map width ([4db941b](https://github.com/nextstrain/nextclade/commit/4db941b8bba9be3b9268765d4f2b65d070f73f57))
* adjust sort and filter buttons sizes and positions ([39f4e19](https://github.com/nextstrain/nextclade/commit/39f4e19225a90b45b91fc1f3f5d43cb8b4471ec9))
* adjust table column widths to accommodate filter and sort buttons ([85551b9](https://github.com/nextstrain/nextclade/commit/85551b9f90a8b6fe54efd4465aa8c76975e4581d))
* avoid main title text overflow ([99b621b](https://github.com/nextstrain/nextclade/commit/99b621bbd8ecbc00b0706356f6a0197869e569af))
* bring back the genome map ([0513fa6](https://github.com/nextstrain/nextclade/commit/0513fa65ec3a971dfdfaf7cd7ff79b5ea8b1b1a8))
* bring back the genome map axis ([fdeedfb](https://github.com/nextstrain/nextclade/commit/fdeedfb897774ba54cd70663bf23f27959f6877f))
* bring back the old layout for the main page ([756d496](https://github.com/nextstrain/nextclade/commit/756d49658e616014b4527f82fc725d7140c59c46))
* bring back the results status panel ([a92114d](https://github.com/nextstrain/nextclade/commit/a92114d411e441294af8604eacc769d64df3aa70))
* constrain main page container width ([727aad0](https://github.com/nextstrain/nextclade/commit/727aad05e5c4760859686e792a0ab0cc32c655dc))
* don't go to /results page ([2225bb4](https://github.com/nextstrain/nextclade/commit/2225bb492772241b31b38edfb7922584085268ac))
* enforce horizontal scrolling on results page if the screen is to narrow ([3e2e409](https://github.com/nextstrain/nextclade/commit/3e2e409ab4e72480de2d8f46a12e5cacf597226d))
* ensure columns are of correct and equal width, prettify ([e169137](https://github.com/nextstrain/nextclade/commit/e169137316d0970c23a3580c36eb274baf5a49ef))
* increase sequence name column width ([a99e15b](https://github.com/nextstrain/nextclade/commit/a99e15ba1d55718f66a2a18aa11693261f3a764b))
* increase sequence name column width to 300px ([f8b53eb](https://github.com/nextstrain/nextclade/commit/f8b53ebd69bd91074e84058676725083cb8caa8d))
* make feature boxes responsive ([8780343](https://github.com/nextstrain/nextclade/commit/87803435dbc3dda24148d7ea970ab699fbe4385d))
* make filter panel collapsible, prettify its contents ([d6714c2](https://github.com/nextstrain/nextclade/commit/d6714c28ce55e265dff9cfcf12ecea894968adf2))
* make footer prettier ([ae8a4d8](https://github.com/nextstrain/nextclade/commit/ae8a4d8a79cd98498c9414fe7fb4556a91b683a0))
* make footer responsive ([c1644b9](https://github.com/nextstrain/nextclade/commit/c1644b9fa8f30de8cef05e7a0ed2e56bb1b9ee4b))
* make pending rows dimmer and of the same color ([fbcfcac](https://github.com/nextstrain/nextclade/commit/fbcfcac9041e59f5d2cef4fb221a4916b225e31f))
* polyfill CSS.escape for internet explorer ([c120f8a](https://github.com/nextstrain/nextclade/commit/c120f8af098fe5ff318236b3237f34e0d3226404))
* prettify filter panel ([b40dcf0](https://github.com/nextstrain/nextclade/commit/b40dcf0ba89348b641b7785033c23f08cd9e9e0e))
* reduce margins, text sizes on small screens, prevent overflow ([160459c](https://github.com/nextstrain/nextclade/commit/160459c308dd9f7d219837b5e2567a95bbfb9e86))
* reduce minimal width to fit on iPad, adjust padding ([e7b666a](https://github.com/nextstrain/nextclade/commit/e7b666a4c46530073287e1c089fca95539a0ecbb))
* remove filter buttons in column headers ([1d21fa3](https://github.com/nextstrain/nextclade/commit/1d21fa34f503c9fa9942220bc10abc34452bcb05))
* sort errored sequences as the ones with the worst QC result ([90599d2](https://github.com/nextstrain/nextclade/commit/90599d26feb04e69ffc0638dcca649f5921d4d99))
* trim filter strings, allow more delimiters ([26182d1](https://github.com/nextstrain/nextclade/commit/26182d12aacce37aff5e9ccbe2bfbea7f7b89c80))
* **dev:** add flag to allow setting fake data and navigating to results page ([b618735](https://github.com/nextstrain/nextclade/commit/b6187354e5e1b8acfa1e01d30b0b2efce7919562))



## [0.1.2](https://github.com/nextstrain/nextclade/compare/0.1.1...0.1.2) (2020-07-03)


### Bug Fixes

* avoid crash in export when there are failing sequences ([6e65d77](https://github.com/nextstrain/nextclade/commit/6e65d7793ecceeb0260e697576942952b6696d1b))
* enable export button even if some of the sequences fail ([dd60ed9](https://github.com/nextstrain/nextclade/commit/dd60ed94139af05106f815570d5836cac3f1cc50))
* lint ([90dbbb7](https://github.com/nextstrain/nextclade/commit/90dbbb74da2cbc0eda106e622eeef9c7d7218f4d))
* remove fake entries ([145b61a](https://github.com/nextstrain/nextclade/commit/145b61aa440daac20424cdca71551c19303ff489))


### Features

* add basic analysis failure reporting ([27736ba](https://github.com/nextstrain/nextclade/commit/27736ba4aadf6767ee6d93cae0d48d1bcbd6b4d3))



## [0.1.1](https://github.com/nextstrain/nextclade/compare/fec09428c477538d9b721a896c9f89172633f693...0.1.1) (2020-07-02)


### Bug Fixes

* add missing hook dependency ([1f0de52](https://github.com/nextstrain/nextclade/commit/1f0de52ae7afd49d2d0a452a13841013a86f671f))
* allow indexing of the website ([92e10c9](https://github.com/nextstrain/nextclade/commit/92e10c977b54c5b3147f38bef5d8d3b1e8ac7fd6))
* apply eslint autofixes ([488cae3](https://github.com/nextstrain/nextclade/commit/488cae3351da526ecb62d5fd307242d10688ab6d))
* avoid html validation errors ([d5627b2](https://github.com/nextstrain/nextclade/commit/d5627b23281308a5ba9cc64fe57ed97787f95631))
* break dependency cycles ([4700de2](https://github.com/nextstrain/nextclade/commit/4700de221426c4efdb25da52d278474c0ece8f69))
* clarify that the tooltip currently shows all the clades ([ac12ea6](https://github.com/nextstrain/nextclade/commit/ac12ea66057c09131fddf1cba6eaa7921a078c49))
* display positions as 1-based ([4940513](https://github.com/nextstrain/nextclade/commit/494051378f7351f61408cca00635d7e63474c196))
* display positions as 1-based for real ([bc31c28](https://github.com/nextstrain/nextclade/commit/bc31c28e62e87d1cb7db7bda4d30d970e3920dcd))
* don't shift svg rectangles by half-width ([481359b](https://github.com/nextstrain/nextclade/commit/481359bdf66e89aa1367aa8060b313ba9c3953f8))
* ensure aminoacid changes are shown correctly ([79453b8](https://github.com/nextstrain/nextclade/commit/79453b881412a762360072e27d4ef1f0535b2b8e))
* ensure isSequenceInClade is typed ([3fe6fcb](https://github.com/nextstrain/nextclade/commit/3fe6fcbc8d18edc11004ecb0da826b9c89dd1bc0))
* ensure type checks can be enabled ([0644baf](https://github.com/nextstrain/nextclade/commit/0644bafeb3adc1dda3f881a9bdccef7364a30db2))
* ensure typing of raw imports ([499a5d7](https://github.com/nextstrain/nextclade/commit/499a5d747d029b11ccf70acc2ab1823495edeef8))
* fix deepscan issues ([ebaa8f6](https://github.com/nextstrain/nextclade/commit/ebaa8f68dfa90e6cf05e5d21fcb03422febaee3c))
* fix guard condition in aminoAcidChange() ([1d9df44](https://github.com/nextstrain/nextclade/commit/1d9df44a2a6c8b08f02a49e10cb36194d6a0d394))
* fix guard condition in aminoAcidChange() ([978a9f6](https://github.com/nextstrain/nextclade/commit/978a9f6a6f05b63c9e383b46185a9634a27f4947))
* fix implicit use of React ([465a082](https://github.com/nextstrain/nextclade/commit/465a0821d0476894bfe6430bcf9d230719d17cb5))
* fix imports ([f5af2aa](https://github.com/nextstrain/nextclade/commit/f5af2aa903bce4dba2df91941375463cefff031c))
* fix lint and type errors ([8a9d7a3](https://github.com/nextstrain/nextclade/commit/8a9d7a38af6b3a61721245c75559b3e7278e13ca))
* fix tests for nucleotide range retrieval ([4991506](https://github.com/nextstrain/nextclade/commit/49915066484ebc1fbaef9ca1e9d436193b93e3ec))
* fix type mismatch ([4fe0a1a](https://github.com/nextstrain/nextclade/commit/4fe0a1ad03d66fa5b4294d18b9dcbf6462e282c5))
* fix typings ([f780257](https://github.com/nextstrain/nextclade/commit/f780257fa8307176a764a73dfd274b811c5c0c5d))
* grammar ([1d948c1](https://github.com/nextstrain/nextclade/commit/1d948c1693d36bdd1094ea241f7c70afaf7d18d8))
* improve button styles ([532c93e](https://github.com/nextstrain/nextclade/commit/532c93ef4315e80cfb58cd52e709963642219773))
* improve translations ([95cf881](https://github.com/nextstrain/nextclade/commit/95cf881f2f0362fdca4b88f2bf0cb0d8743fa0c1))
* lint ([8d85353](https://github.com/nextstrain/nextclade/commit/8d8535367985e11c86a6191cfee937dd458b5632))
* lint ([be874ae](https://github.com/nextstrain/nextclade/commit/be874aeaebb6cdfbb76bdcceaee4ad0e1f063e55))
* lint ([af82d9f](https://github.com/nextstrain/nextclade/commit/af82d9f64277411197bf8b65c390e44f00e89323))
* lint ([c36c6a9](https://github.com/nextstrain/nextclade/commit/c36c6a9bbff4ce0ad5f18c8d2f854c05f3cd4569))
* lint ([da9c98d](https://github.com/nextstrain/nextclade/commit/da9c98df353e8bf8c081450fe9555a530f402ce8))
* lint ([4eb882c](https://github.com/nextstrain/nextclade/commit/4eb882c1c3596673b9790bdd4fe08ddb1cdae404))
* lint ([6567a4b](https://github.com/nextstrain/nextclade/commit/6567a4b1f48e5c174476d391d197f435dddb178f))
* lint ([0eaa7c9](https://github.com/nextstrain/nextclade/commit/0eaa7c9b8248b94ac8379c36f0012fa8fbe2a090))
* lint ([c79c2ca](https://github.com/nextstrain/nextclade/commit/c79c2caf7b1689a2d909a7105539958529a36c3e))
* lint ([f95d453](https://github.com/nextstrain/nextclade/commit/f95d453fd477ff2f1dbec2558937f3280da62881))
* lint errors ([6309298](https://github.com/nextstrain/nextclade/commit/630929821c093dcbe8cf6d7fe19a36eee3e40929))
* lint errors ([cbf9215](https://github.com/nextstrain/nextclade/commit/cbf921594697c217ed32421567e525ab8f11b23e))
* lint errors ([404bbf7](https://github.com/nextstrain/nextclade/commit/404bbf72279a2e8298b56ba89ae8210d59896bfa))
* lint errors ([add6b26](https://github.com/nextstrain/nextclade/commit/add6b266b88504504573a18fb138585e08f84c32))
* lint errors ([9047a0a](https://github.com/nextstrain/nextclade/commit/9047a0aebfc0e203a2f99a1b4888851259631f7c))
* make "back" button to actually go back, not to a specific page ([9cd3c91](https://github.com/nextstrain/nextclade/commit/9cd3c917bca3888943b9913f1a14ae7239b19736))
* make sure "dirty" flag is set properly ([4f4024d](https://github.com/nextstrain/nextclade/commit/4f4024d0f9a068f4526e2e1f07633db40d2db268))
* make sure "to results" button shows up ([05b77d0](https://github.com/nextstrain/nextclade/commit/05b77d0dc013a7daf1ee5108db765ca9d251f4bb))
* make sure settings saga is being run ([28095a8](https://github.com/nextstrain/nextclade/commit/28095a8c917e50243d8c6f5867e73b9ae0b67bd6))
* packages/web/package.json, packages/web/yarn.lock & packages/web/.snyk to reduce vulnerabilities ([73555b8](https://github.com/nextstrain/nextclade/commit/73555b89675d90a069dd95cf5275f4fc04f90411))
* packages/web/package.json, packages/web/yarn.lock & packages/web/.snyk to reduce vulnerabilities ([d1ab37a](https://github.com/nextstrain/nextclade/commit/d1ab37a03236572cd412fef1576abda6826a25af))
* remove aligned query from results ([0a3f999](https://github.com/nextstrain/nextclade/commit/0a3f9995672dc08fa5eab2aed0c3d9ad3d443bcc))
* remove redundant table borders ([25c016d](https://github.com/nextstrain/nextclade/commit/25c016d394188e7a6dcc6e0f6a00bc8057bacc06))
* remove unused and vulnerable packages ([9214419](https://github.com/nextstrain/nextclade/commit/9214419274e84bdc6d515c7a8fec09267ae2bf9b))
* rename file to clarify intent ([2b6a213](https://github.com/nextstrain/nextclade/commit/2b6a213fc6d610fa48045cfe2360178ace8714a3))
* resolve Threads.js workers bundling error in production  ([bd775a8](https://github.com/nextstrain/nextclade/commit/bd775a800eab871780d5a5a93b5385b2d99bf56b))
* silence eslint rule that produces false positives in typescript ([c3b0e48](https://github.com/nextstrain/nextclade/commit/c3b0e4813823b18d5115948f278db9ded39b0d5f))
* silence more new eslint rules that produce false positives in typescript ([a76cf14](https://github.com/nextstrain/nextclade/commit/a76cf1486cfe2f603f956443e347a1a0baed8701))
* soften border color ([763e227](https://github.com/nextstrain/nextclade/commit/763e2270a235618a96785e59351188561d90d2db))
* trim whitespace and line ending characters from reference sequence ([86cd548](https://github.com/nextstrain/nextclade/commit/86cd5487b39377fe8aa99dc438e6aa455a5bca0b))
* type and refactor getAllAminoAcidChanges ([1e95f2f](https://github.com/nextstrain/nextclade/commit/1e95f2f97440e1239fd5af43f379ce4046ee2ea2))
* type errors ([92486a7](https://github.com/nextstrain/nextclade/commit/92486a709ca55a3ae240cf4e19a3daf716f279c9))
* type errors in saga ([fefdace](https://github.com/nextstrain/nextclade/commit/fefdace146d0a56ce6d3d237d34b6ff8cfbe48e0))
* **dev:** disable eslint cache for consistent results, disable checker profiling ([3f9962e](https://github.com/nextstrain/nextclade/commit/3f9962e5eca94c49e7ee775348c18b82dba23f26))
* **dev:** ensure webpack watches the typings ([f0a667d](https://github.com/nextstrain/nextclade/commit/f0a667d2a678538e70fa40895ccbd2b65893af81))
* **dev:** make sure type checking can be disabled ([5f4918b](https://github.com/nextstrain/nextclade/commit/5f4918bbafde19c2f8273ce5d2cef03130b20091))


### Features

* add "to results" buttons on main page, prettify "back" button ([887ca23](https://github.com/nextstrain/nextclade/commit/887ca239bb5ab7a9a6365fc033eb63dfd91f9c4e))
* add aminoacid changes to sequence name tooltip ([4b7b232](https://github.com/nextstrain/nextclade/commit/4b7b232ccce63ccad9cbfcb9c4a622e680c64c39))
* add aminoacid mutations to mutation tooltips ([5643863](https://github.com/nextstrain/nextclade/commit/56438630ffff3e6855096f96d279f15d33a0b08c))
* add back and settings buttons ([ff6f359](https://github.com/nextstrain/nextclade/commit/ff6f35985c4b88a0bf7c6136693a8ee8da335ee2))
* add basic progress indicator ([1ac9736](https://github.com/nextstrain/nextclade/commit/1ac9736573068593a9d6d9be8b522a596fa6a3a0))
* add basic SEO tags ([5e597df](https://github.com/nextstrain/nextclade/commit/5e597dfe8ba9838c5ddeb586cf1f27bdbe31fef4))
* add basic sequence visualization ([d2bd0cb](https://github.com/nextstrain/nextclade/commit/d2bd0cbd1535699bf868966e2a0e51f6df35c41a))
* add beta badge ([97bcf43](https://github.com/nextstrain/nextclade/commit/97bcf43ad4d70541f9acacc935bc7cc18baf5d36))
* add clade info to the tooltips ([5588cd1](https://github.com/nextstrain/nextclade/commit/5588cd17cc600ccb58dcc5172bc5224ab9821534))
* add clade marks to gene map ([b197d3b](https://github.com/nextstrain/nextclade/commit/b197d3b920fd7d999fb88c4c3681c2a4dc3f0071))
* add csv export ([59247dc](https://github.com/nextstrain/nextclade/commit/59247dc029f8d476a0e2ae24689bd879e59ae41d))
* add exports to both JSON and CSV using dropdown button ([47e8570](https://github.com/nextstrain/nextclade/commit/47e85702d5695950ebfff4d3b5befd5ecfd8cc80))
* add favicons ([0ff52c7](https://github.com/nextstrain/nextclade/commit/0ff52c77889227c40dacf0021a55539029719663))
* add footer branding ([4ae2d37](https://github.com/nextstrain/nextclade/commit/4ae2d37905dc7312d4fee98c405619e7290c71e9))
* add French to language selector ([04c7f4c](https://github.com/nextstrain/nextclade/commit/04c7f4cde17916007aa002c49aa860e27bde5cac))
* add gene map ([e938c68](https://github.com/nextstrain/nextclade/commit/e938c687c5f4b76602ee9c993690dd405011ba8a))
* add list of non-ATTGCN to tooltips ([bbe2a61](https://github.com/nextstrain/nextclade/commit/bbe2a61343f996b1c06adb25866d4497ede7cee6))
* add more languages ([15dd09c](https://github.com/nextstrain/nextclade/commit/15dd09c5edb1e085ac2d94014468e876719e34ec))
* add mutation tooltips ([f2bfc64](https://github.com/nextstrain/nextclade/commit/f2bfc647ed8618ad6440db7230dd7e6422ccd53b))
* add navigation bar, routing and about page ([7bc2fff](https://github.com/nextstrain/nextclade/commit/7bc2fff953043650bfa776da3ed5bb9053cbf505))
* add Ns and Gaps to the table ([d443df6](https://github.com/nextstrain/nextclade/commit/d443df6904895371b5b01e96735fda0b68de3b69))
* add numbered X axis (position) to sequence view ([6d6304a](https://github.com/nextstrain/nextclade/commit/6d6304ae9573d1e8d29169825054dad4892df4cc))
* add progress bar embedded into the drop box ([2d058a6](https://github.com/nextstrain/nextclade/commit/2d058a63a6adeb0d33c960fbb42ec5585544fac7))
* add proper results table ([1bd4a49](https://github.com/nextstrain/nextclade/commit/1bd4a493aa780ee27b964a1d61b554db95285d05))
* add results download ([840aa80](https://github.com/nextstrain/nextclade/commit/840aa804da96039b756e4440af5b4f9fc9f8d185))
* add tooltips for the "sequence" and "clades" columns ([55e1cbe](https://github.com/nextstrain/nextclade/commit/55e1cbe9ce42cfaf0176dfabcc953db2a51efba3))
* add total number of mutations to the table ([04352f0](https://github.com/nextstrain/nextclade/commit/04352f0b674d0a33a776dd9228c92ce24757dc5a))
* add tree of clades ([4baa357](https://github.com/nextstrain/nextclade/commit/4baa357f04281e5b9b337e72aa80a9a29a47cee3))
* add upload ([a4c0bde](https://github.com/nextstrain/nextclade/commit/a4c0bdea55844490a65ea8062d6c3d0bbc32e99d))
* add version text to footer ([ee74087](https://github.com/nextstrain/nextclade/commit/ee74087123e50325d0b6ec23135134769fc09baa))
* allow parameters for multiple viruses ([4295cf6](https://github.com/nextstrain/nextclade/commit/4295cf66f318de9527876302f7c4ae9946775e12))
* avoid opening input box to speedup navigation to results page ([5d87ca8](https://github.com/nextstrain/nextclade/commit/5d87ca8dc0728c217ede2526685c4c018162bc98))
* borrow some more styling and components from nextstrain.org ([d264601](https://github.com/nextstrain/nextclade/commit/d26460151259554ef158dd530e29d2f1b47c8761))
* change example link text ([bb99908](https://github.com/nextstrain/nextclade/commit/bb99908e1a88f2aa925388ef982b708ee57d05a6))
* change nucleotide colors ([fb22e96](https://github.com/nextstrain/nextclade/commit/fb22e96572cd1ebfaf7981c6757b2266c60a8885))
* change text for clade mutations ([aff5073](https://github.com/nextstrain/nextclade/commit/aff507370f887c381e1c34697771dbdeecdcda50))
* cleanup and simplify marker tooltips ([34e54f9](https://github.com/nextstrain/nextclade/commit/34e54f9db2746a2e2fcb530a5d429ac3b3ce5136))
* cleanup gene tooltip ([87ec1ef](https://github.com/nextstrain/nextclade/commit/87ec1efc7daf35c19235b0f1f7a26ae3e4dc28a5))
* disable export button until the processing is complete ([1d50eb4](https://github.com/nextstrain/nextclade/commit/1d50eb412ad5f1405c6cbdc2d19e702aa6cd77a8))
* display alignment score ([fb62658](https://github.com/nextstrain/nextclade/commit/fb62658cb58e32a58e7f22c0295726afe95795b2))
* don't wrap the text in text area ([a8824b4](https://github.com/nextstrain/nextclade/commit/a8824b4b0d44ee3863b9b1f1de9262a8172f17d4))
* filter out empty clades ([f7405c0](https://github.com/nextstrain/nextclade/commit/f7405c013bf2f3a405335c9c1059274929f6c9a0))
* format mutations ([c49a5e2](https://github.com/nextstrain/nextclade/commit/c49a5e25761a357a261f34d8fb4e48b02e5a8272))
* format totals and clades in tooltips ([4361528](https://github.com/nextstrain/nextclade/commit/4361528ba5248a227e819f324c2625321aeffacf))
* group clades in mutation tooltips on gene map ([6971f9c](https://github.com/nextstrain/nextclade/commit/6971f9c9495d5481e324bf4f42fe2b63252a1929))
* implement reducer for updating results ([cae5fb1](https://github.com/nextstrain/nextclade/commit/cae5fb1a94ea249fa060124a661f4e4ddaad37e2))
* improve sequence view styling in dark mode ([b0e1327](https://github.com/nextstrain/nextclade/commit/b0e1327381a2fc74ac2bbff13e39e8bb576ff417))
* improve styling ([8d1fe93](https://github.com/nextstrain/nextclade/commit/8d1fe935456b3c2b2d46b39e1e821924e866d389))
* limit number of mutations in the tooltip to 10 ([4d6f077](https://github.com/nextstrain/nextclade/commit/4d6f077c1075d57970debc3f16542a3a1b0229f0))
* load example data when clicking the link ([7ceeed9](https://github.com/nextstrain/nextclade/commit/7ceeed9c91fbde6513db09b7aa554a27dae25eff))
* load no data, avoid running on startup ([fec2219](https://github.com/nextstrain/nextclade/commit/fec221968b52df6c69a2198881b4eaabba68b27e))
* make it more like nextstrain ([44092d7](https://github.com/nextstrain/nextclade/commit/44092d7d8a54421fe6f09de903d2ab680056c62d))
* make layout container fluid ([551a958](https://github.com/nextstrain/nextclade/commit/551a958f7c7c62b3269d15beb2cb804a815859ea))
* make separate runs per sequence in a saga ([662b3b8](https://github.com/nextstrain/nextclade/commit/662b3b8ca554d7ca48d3a785134ba825c84c00cd))
* make sure eslint, tsc and stylelint can be disabled in production ([d3c5f29](https://github.com/nextstrain/nextclade/commit/d3c5f2966cc232372be45693eb20a47b1d3f2d37))
* make sure redux dev tools can be enabled in production ([4cb3622](https://github.com/nextstrain/nextclade/commit/4cb3622f71cd7007e572cea2acebd8565a2f0f5f))
* make upload zone flat ([5ccf82c](https://github.com/nextstrain/nextclade/commit/5ccf82cad3e340104791e507775aadfcff4579fc))
* mention freedom and openness, add todos for more content ([5b1dcec](https://github.com/nextstrain/nextclade/commit/5b1dcec8ad0d9609e73569f8f2fa915b9e55369a))
* move file reader into parser worker ([5837c05](https://github.com/nextstrain/nextclade/commit/5837c059a2410ed66a6054ec5fa576ab214fba2e))
* navigate to results page on input change ([538d6e2](https://github.com/nextstrain/nextclade/commit/538d6e24f6f421ee5b62c7ece208dcd5aa0c5085))
* persist input box state on navigation ([52aa653](https://github.com/nextstrain/nextclade/commit/52aa653108cb3804f8c13bbc5d39e394ca9e40c7))
* prefetch index and results page for instant navigation ([8f3716d](https://github.com/nextstrain/nextclade/commit/8f3716dcca6e7361d42fbb4c469a87c7a06d9993))
* prettify dev alert ([b6c1795](https://github.com/nextstrain/nextclade/commit/b6c1795c930d905cf409273b50e718f98af0c9ee))
* prettify feature boxes ([641183c](https://github.com/nextstrain/nextclade/commit/641183c1ff78d0e507711083241326083c50cc1c))
* prettify hero section on landing page ([a99a792](https://github.com/nextstrain/nextclade/commit/a99a7926b970bed0bc68b03cdde76d23ae299b05))
* prettify info section ([95302ba](https://github.com/nextstrain/nextclade/commit/95302ba093b9cf304510d9834f85299a306034bf))
* prettify mdx content ([ae52e18](https://github.com/nextstrain/nextclade/commit/ae52e18425d134b10d374e603cce569b127acdea))
* reduce text spacing the the tooltip ([1c7176f](https://github.com/nextstrain/nextclade/commit/1c7176fd23790e75bccb2158f9e4f49abf6ae450))
* reimplement the old behavior in react ([fec0942](https://github.com/nextstrain/nextclade/commit/fec09428c477538d9b721a896c9f89172633f693))
* remove "Results" nav link ([010f6f9](https://github.com/nextstrain/nextclade/commit/010f6f9dc7fa64b0a37e0dad41d55e756db7e618))
* remove About page ([8ba236a](https://github.com/nextstrain/nextclade/commit/8ba236a77ad4ad21b53f88449b1360ddd0f35de8))
* remove input's border to not conflict with card border ([92cd724](https://github.com/nextstrain/nextclade/commit/92cd724e7eaa18a7c5857a4f23e0adfff10530cc))
* remove percentage text from the progress bar ([05d2623](https://github.com/nextstrain/nextclade/commit/05d2623e2648a732c168e1628352d07aad530be3))
* render results from Redux store ([de2d75a](https://github.com/nextstrain/nextclade/commit/de2d75a7420506e2ee7f7f7c9dacb2399f4356ba))
* reorganize the About section ([2df61f8](https://github.com/nextstrain/nextclade/commit/2df61f8fabe5e4c94e836dcf266c8fd19e3b8b83))
* replace QC text with icons ([56be063](https://github.com/nextstrain/nextclade/commit/56be0639538753955c1e68c6e6a283abafb4bc64))
* reset all translations ([766977f](https://github.com/nextstrain/nextclade/commit/766977ff7b7b9cf40088c31a2fff171daed5dd54))
* restrict container size to lg ([24145db](https://github.com/nextstrain/nextclade/commit/24145dbd63035f2942f7dbc48be940ede228de78))
* retrieve input text back from reader/parser worker ([c75ea79](https://github.com/nextstrain/nextclade/commit/c75ea79dbb2e9a73eef3f01737ef1832c1ec9a00))
* run sequence analysis in a worker pool concurrently (per sequence) ([a96f138](https://github.com/nextstrain/nextclade/commit/a96f13877298a328d893aaba5aacecb0eb214e6b))
* run the algorithm in a webworker ([54fcbee](https://github.com/nextstrain/nextclade/commit/54fcbee8e75a2238e5c00bcfa09502d7f2ee0e1d))
* run, navigate to results, and open paste dialog only when dropped a file  ([b3b7472](https://github.com/nextstrain/nextclade/commit/b3b747267a6d2d2fa57092c6e4c4abb0aebe0432))
* set gene colors from auspice  ([5d90436](https://github.com/nextstrain/nextclade/commit/5d9043667b94739989aafdfdde9983a1d26e8620))
* setup production build and static compression ([7cb0fac](https://github.com/nextstrain/nextclade/commit/7cb0faca6341a047743193f96bfc421714affe7f))
* show all clades ([c598f7b](https://github.com/nextstrain/nextclade/commit/c598f7b812d37e8a2ced062e01b25d234f80665f))
* show and focus input box, delay paste when loading the example ([7f5dbcc](https://github.com/nextstrain/nextclade/commit/7f5dbccd3922d4504517ac11864d112b09d3e72e))
* show sequence names early on, before analysis is completed ([a5d8754](https://github.com/nextstrain/nextclade/commit/a5d8754933107670e4df84b8e297d2cae3123360))
* show the gaps and Ns on the plot ([0704fb2](https://github.com/nextstrain/nextclade/commit/0704fb2c5ee3b3dbd32b29568e2a190fe2d1f092))
* show uploaded file name and size on the drop area ([039a0c5](https://github.com/nextstrain/nextclade/commit/039a0c578ec99c55390aa47949d8eb8db228c9b9))
* split upload and results into separate pages ([862ca3d](https://github.com/nextstrain/nextclade/commit/862ca3d351532221cf4f1be6a26bc614f647252d))
* translate more strings ([37dd6db](https://github.com/nextstrain/nextclade/commit/37dd6dbdf8792968fabebff039f21979e28b7794))
* write input filename and size into state ([61f1591](https://github.com/nextstrain/nextclade/commit/61f159174734f096bce19dec81410b800b783875))


## [0.1.0](https://github.com/nextstrain/nextclade/compare/0.7.7...0.7.8) (2020-06-11)

Development started
