# Distant parts of a sequence are reported as one long deletion

## Problem

A query whose parts match distant regions of the reference has no sound result. Without the seed chain check (before 3.26.0, with the `short-sequences` preset, or with a large `--max-seed-chain-deletion-ratio`), it gets one linear alignment with a long deletion between the parts. The region between the parts was not sequenced, so the deletion, the coverage and the QC status are unsound. QC length scaling counts the region as covered too, so it gives the parts thresholds near those of a full genome instead of thresholds for their own length. With the check (the default since 3.26.0), the whole sequence is rejected and its sound parts are lost.

Examples from public Pathoplexus data, aligned with Nextclade 3.24.0, before the check:

- `PP_000KAQ4.3` (West Nile, 497 nt): two amplicons joined by 100 `N`. One deletion of 7,294 nt (1813-9106), coverage 0.697, QC "good"
- `PP_0029GNM.1` (hMPV, 377 nt): two amplicons joined by 100 `N`. The second amplicon, which matches reference 11347-11459, is aligned next to the first at about 890-1012, with 66 false substitutions and a frameshift, QC "good"
- An mpox fold-back read of 2,480 nt: a deletion of 189,367 nt, coverage 0.97, QC "good", and the 7 substitutions of the duplicated part counted twice. Its first 1,638 nt alone align with 10 substitutions and no deletion

In about 44,600 Pathoplexus sequences of five organisms, 15 sequences have this shape. Evidence, classes and options: [`proposals/align-sequences-with-distant-parts.md`](../proposals/align-sequences-with-distant-parts.md).

## Code

- Seed chaining without a gap cost: `fn chain_seeds()` ([packages/nextclade/src/align/seed_match.rs#L326](../../packages/nextclade/src/align/seed_match.rs#L326))
- Check before the band is built: `fn align_nuc()` ([packages/nextclade/src/align/align.rs#L76-L98](../../packages/nextclade/src/align/align.rs#L76-L98)) and `fn find_distant_seed_chain_gap()` ([packages/nextclade/src/align/seed_match.rs#L519](../../packages/nextclade/src/align/seed_match.rs#L519))
- Coverage and the lengths of QC length scaling count deleted bases inside the alignment range as covered ([packages/nextclade/src/run/nextclade_run_one.rs#L169-L171](../../packages/nextclade/src/run/nextclade_run_one.rs#L169-L171), [#L474-L479](../../packages/nextclade/src/run/nextclade_run_one.rs#L474-L479))

## Fix

Align each well-supported part on its own and report the reference between collinear parts as unsequenced; report duplicate, reversed or out-of-order parts as unaligned query ranges with a warning; reject a sequence only when no part aligns. A first step that removes every unsound result is to align only the best supported part and report the rest as unaligned.

> [!IMPORTANT]
> **Decision required.** The fix changes shipped output (alignment, deletions, coverage, QC, schemas) and needs the maintainers' approval on these axes of the proposal:
>
> - Treatment: best supported part only, or split alignment of every supported part
> - Representation of the unsequenced range between parts: `N` in the existing fields (the QC rule for missing data then counts it), or new fields for unsequenced reference ranges and unaligned query ranges
> - Real long deletions: never call a deletion longer than a multiple of the query length, or call it when the query is contiguous across the junction, with a warning
> - Configuration: one mode parameter (`split`, `reject`, `deletion`) with a deprecation path for `maxSeedChainDeletionRatio` and `minSeedChainPartCover`, or the two numeric parameters only

## Validation

- Unit tests with in-memory references for each class: joined parts with an `N` run, fold-back duplicate, contiguous junction
- Compare the results on the Pathoplexus sequences of the proposal with Nextclade 3.24.0: the 15 joined records get two aligned blocks with their own substitutions and no deletion, and no other result changes
- With a dataset that sets `lengthScaling`, check that the QC length of a joined record covers its aligned parts only
