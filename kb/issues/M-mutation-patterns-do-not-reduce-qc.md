# Mutation patterns do not reduce the SNP cluster QC score

## Problem

Mutation patterns exist so that expected clusters from editing enzymes, such as ADAR (A>G and T>C) and APOBEC (C>T and G>A), can be told apart from sequencing or assembly artifacts. The analysis reports these clusters, but the `qc.snpClusters` rule still counts every private substitution, including the ones matched by a pattern. A sequence with ADAR hyperediting therefore keeps its SNP cluster penalty.

The user documentation states that patterns do not change QC ([docs/user/input-files/05-pathogen-config.md](../../docs/user/input-files/05-pathogen-config.md), section "Nucleotide mutation pattern detection"). A description of the feature that says patterns keep editing clusters out of the QC penalty does not match the code.

## Code

- QC clusters come from all private substitutions ([packages/nextclade/src/analyze/mutation_patterns.rs#L341-L353](../../packages/nextclade/src/analyze/mutation_patterns.rs#L341-L353))
- Pattern results are output only; nothing links them to `qc.snpClusters`

## Decision needed

Changing the QC score changes shipped output for any dataset that enables it, so it needs an explicit decision. Options:

- **Opt-in exclusion per pattern**: for example `"excludeFromQc": true`, which removes matched substitutions from the input of the SNP cluster rule
- **Exclusion list in the QC rule**: for example `qc.snpClusters.excludePatterns: ["adar"]`
- **Keep patterns report-only**: state this in the feature description and in the dataset documentation

Any exclusion needs a test in which a sequence whose only cluster matches an excluded pattern gets a SNP cluster score of 0.
