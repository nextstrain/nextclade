# Run of N for a gap of unknown length is aligned as sequence

## Problem

INSDC records mark a gap of unknown length between two sequenced pieces with 100 `N`. Nextclade aligns these `N` as 100 bases of sequence. When the two pieces come from distant regions of the reference, the second piece is either forced next to the first, with false substitutions, or linked to its true position by a long deletion. Both results are unsound.

Public Pathoplexus data has 15 such records in 4 organisms: 11 hMPV (`PP_0029GNM.1` and others, 377 nt, `N` at 164-263), 3 West Nile (`PP_000KAQ4.3`, `PP_000KAS0.3`, `PP_000KAVU.3`) and 1 ANDV L (`PP_006VQ9V.1`). Each piece aligns cleanly on its own. Evidence: [`proposals/align-sequences-with-distant-parts.md`](../proposals/align-sequences-with-distant-parts.md).

## Code

- Seed chaining across the `N` run: `fn chain_seeds()` ([packages/nextclade/src/align/seed_match.rs#L326](../../packages/nextclade/src/align/seed_match.rs#L326))
- Alignment of the band that the chain defines: `fn create_alignment_band()` ([packages/nextclade/src/align/seed_alignment.rs#L86](../../packages/nextclade/src/align/seed_alignment.rs#L86))

## Fix

Treat a seed gap whose query interval contains a run of `N` of at least a set length as unsequenced: the pieces on its two sides align as separate blocks, and the reference between them is reported as unsequenced, never as deleted. This depends on the split alignment of [`H-align-distant-parts-reported-as-deletion.md`](H-align-distant-parts-reported-as-deletion.md).

> [!IMPORTANT]
> **Decision required.** The run length that marks an unknown-length gap: exactly 100 (the INSDC convention), or any run of at least a set length, which also covers other submitters' conventions but can split a sequence at a long run of low-quality bases. Both change shipped alignments of the affected records.

## Validation

- Unit test: two pieces of an in-memory reference, 10 kb apart, joined by 100 `N`, align as two blocks with no deletion
- The 15 Pathoplexus records get two blocks each, with the substitutions of each piece at its true position
