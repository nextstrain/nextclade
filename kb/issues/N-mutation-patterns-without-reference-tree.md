# Mutation patterns report nothing for datasets without a reference tree

## Problem

Mutation patterns are evaluated on private mutations, which are the substitutions relative to the nearest node on the reference tree. A dataset without `tree.json` has no nearest node, so its private mutations are empty and every pattern reports zero matches. Nextclade loads such a dataset without a warning, and Nextclade Web has no "Parent" view in which to show the results.

The `nextstrain/orthoebolavirus/sudv` dataset is an example: its `pathogen.json` defines patterns, but it has no reference tree, so the patterns never produce results in the CLI or in the web application.

## Code

- `fn analyze_mutation_patterns()` receives the private substitutions (`packages/nextclade/src/run/nextclade_run_one.rs`)
- Without a tree, the private substitutions come from `NextcladeResultWithGraph::default()` (same file)

## Fix options

- **Warn at dataset load**: report that `mutationPatterns` needs a reference tree when the dataset has none
- **Evaluate relative to the reference**: use substitutions relative to the reference sequence when there is no tree. This changes what a match means (fixed lineage differences count as matches) and needs a scientific decision
- **Remove patterns from datasets without a tree**: a dataset change only
