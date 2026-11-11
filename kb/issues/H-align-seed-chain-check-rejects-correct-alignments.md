# Seed chain check rejects correct alignments of short divergent sequences

## Problem

Since 3.26.0, Nextclade rejects by default a sequence whose seed chain contains a gap longer than `--max-seed-chain-deletion-ratio` times the query length, with at least `--min-seed-chain-part-cover` of the total seed length on each side. A short divergent query has few seeds in total, so one spurious seed of about 20 nt far from the true position passes the part-cover condition. The alignment ignores that seed, because terminal gaps are free, so the rejected alignment would have been correct.

With the default values (ratio 10, part cover 0.2), the check rejected 99 correct alignments in public Pathoplexus data, which broke the upgrade of its preprocessing pipelines ([pathoplexus/pathoplexus#1217](https://github.com/pathoplexus/pathoplexus/issues/1217)): 96 hMPV amplicons of 113-609 nt and 3 Zika amplicons of 118-174 nt. Nextclade 3.24.0 aligned each of them locally, with QC "good". Example: `PP_002FFR4.2` (hMPV, 206 nt), chain parts at 6317-6356 and 11443-12018, aligned by 3.24.0 at 6295-6500 with no deletion. The hMPV dataset sets loose seed parameters (`kmerLength` 5, `minMatchLength` 20, `allowedMismatches` 10), and the Zika sequences are rejected only with the `high-diversity` preset of their dataset.

No part-cover value separates these sequences from the sequences that the check is meant to catch: with 0.4, 25 hMPV false rejections remain, and 11 hMPV records of two amplicons joined by 100 `N` are no longer rejected. Evidence and options: [`proposals/align-sequences-with-distant-parts.md`](../proposals/align-sequences-with-distant-parts.md).

## Code

- `fn find_distant_seed_chain_gap()` ([packages/nextclade/src/align/seed_match.rs#L519](../../packages/nextclade/src/align/seed_match.rs#L519))
- Seed chaining: `fn chain_seeds()` ([packages/nextclade/src/align/seed_match.rs#L326](../../packages/nextclade/src/align/seed_match.rs#L326))

## Fix

Short term (decided): turn the check off by default, so that it runs only when the ratio is set: [`tickets/align-seed-chain-check-off-by-default.md`](../tickets/align-seed-chain-check-off-by-default.md).

Long term: remove weak far seeds from the chain before the band is built (a gap cost or an outlier filter in `fn chain_seeds()`), and decide whether a far part is real by alignment evidence: align its query segment at the far site and as a continuation of the main part, and accept the far site only when it scores clearly better. Seed density per part can serve as a cheap pre-filter.

## Validation

- Unit test: a short divergent query with one spurious far seed aligns locally
- On the Pathoplexus sequences of the proposal, none of the 99 sequences is rejected, and the 15 joined records are still detected
