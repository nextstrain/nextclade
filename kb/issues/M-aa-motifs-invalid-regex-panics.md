# Invalid `aaMotifs` regex crashes Nextclade

## Problem

`fn process_one_motif()` compiles each `aaMotifs[].motifs[]` regex and calls `.unwrap()` on the result. An invalid regex, for example `N[^P` with an unclosed class, is not rejected with an error message. `Nextclade::new` searches the motifs in the reference translation, so the first dataset load panics:

- CLI: the process crashes with exit status 101 and a backtrace that ends in `find_aa_motifs.rs`, instead of an error that names the dataset field
- Web: the WASM module aborts while it loads the dataset

The same function compiles each regex again for every CDS range of every analyzed sequence, which is wasted work for valid motifs too.

Reproduction: add `{"name": "bad", "nameShort": "B", "nameFriendly": "Bad", "description": "d", "includeCdses": [], "motifs": ["N[^P"]}` to `aaMotifs` of any dataset and run `nextclade run`.

## Code

- `.unwrap()` of `Regex::new(motif)` ([packages/nextclade/src/analyze/find_aa_motifs.rs#L124-L126](../../packages/nextclade/src/analyze/find_aa_motifs.rs#L124-L126))
- Reference motifs at dataset load ([packages/nextclade/src/run/nextclade_wasm.rs#L356](../../packages/nextclade/src/run/nextclade_wasm.rs#L356))

## Fix

Compile and validate every motif once at dataset load, return an error that names the motif, and keep the compiled regexes in the `Nextclade` state for the per-sequence search. Mutation patterns follow this approach (`struct MutationPatterns` in `packages/nextclade/src/analyze/mutation_patterns.rs`).
