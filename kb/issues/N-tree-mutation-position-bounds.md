# Reference tree mutations at invalid positions crash Nextclade

## Problem

Nextclade reads the nucleotide mutations of each reference tree branch, such as `A101G`, when it loads a dataset. Two position values crash the load instead of giving an error:

- **One position past the reference end**: `fn map_nuc_muts()` rejects a position only when it is greater than the reference length ([packages/nextclade/src/tree/tree_preprocess.rs#L121](../../packages/nextclade/src/tree/tree_preprocess.rs#L121)). The 0-based position equal to the length passes, and the next line indexes the reference out of bounds, which panics. For a reference of 100 nucleotides, `A101G` crashes the load. The check needs `<=`
- **Position 0**: `fn parse_pos()` subtracts 1 from the parsed `usize` ([packages/nextclade/src/io/parse_pos.rs](../../packages/nextclade/src/io/parse_pos.rs)). For `A0G`, this overflows: debug builds panic, and release builds wrap to position -1

Only malformed datasets have such positions: a dataset that loads today has none.

## Fix

Use `<=` in the bounds check of `fn map_nuc_muts()`, and reject position 0 in `fn parse_pos()` with an error.
