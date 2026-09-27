# Mutation pattern motifs cannot fix the position of the substituted base

## Problem

A motif qualifies a substitution when any motif site contains the substituted position, at any offset. Mutational signature contexts fix the offset of the mutated base, for example `T[C>T]W`. A motif that contains the reference nucleotide at several offsets matches substitutions at each of them. For example, motif `A[ACGT]G` for A>G also matches when the substituted A is the one before G.

The documentation tells authors to write motifs in which the reference nucleotide occurs at one offset only.

## Code

- `fn MotifSites::matches_containing()` ([packages/nextclade/src/analyze/mutation_patterns.rs](../../packages/nextclade/src/analyze/mutation_patterns.rs))

## Options

- **Anchor marker**: require a capture group for the substituted base, for example `T(C)[AT]`
- **Flank regexes**: separate `upstream` and `downstream` regexes matched directly before and after the position
