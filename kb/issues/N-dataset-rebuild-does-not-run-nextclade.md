# Dataset rebuild does not load datasets with Nextclade

## Problem

The `nextclade_data` rebuild script (`scripts/rebuild`) checks each `pathogen.json` only against the Nextclade JSON schema. The schema cannot express many of the checks that Nextclade makes when it loads a dataset:

- regexes that do not compile, in `aaMotifs` and in mutation pattern motifs
- the mutation pattern motif rules: exactly one group in parentheses, a group of one nucleotide that accepts a `ref` nucleotide, and nucleotide codes only
- unique mutation pattern ids, and other checks in Rust code

A dataset with such an error passes the rebuild, and fails only when a user loads it.

A regex check in the Python rebuild script does not solve this: Python `re` syntax differs from the Rust `regex` crate, and the motif rules would need a second implementation that can drift from the Rust code.

## Fix

Run a pinned Nextclade release on each changed dataset with its example sequences during the rebuild, once a release includes mutation patterns. This checks the complete dataset load, and the analysis of the examples, with the same code that users run.
