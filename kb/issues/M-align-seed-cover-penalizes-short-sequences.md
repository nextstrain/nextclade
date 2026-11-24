# Seed cover penalizes short sequences

## Problem

Nextclade does not align a query when its seeds cover less than `minSeedCover` of it. Seed cover is the number of nucleotides in the seed chain divided by the query length. Two steps of the seed code lose a fixed number of nucleotides per sequence, whatever its length:

- Trim: after extension, each end of a seed is cut back to the end of the longest run of matches in its last `windowSize` bases. The code also does this when the extension stopped at the end of the query, which costs up to `windowSize - 1` nt per end
- Cut: the seed is split into pieces of `minMatchLength`. The last piece starts `minMatchLength` before the seed end, so it overlaps the piece before it, and the chain counts only `floor(L / minMatchLength) * minMatchLength` nt of a seed of L nt

On 2,000 nt these losses are 1 to 3% of the cover. On 100 nt they decide between pass and fail: with `minMatchLength` 30, a perfect 100 nt match scores 90%, and a 100 nt query can only score 0, 30, 60 or 90%.

Evidence from the `enpen/enterovirus/ev-a71` dataset (`minSeedCover` 0.79, raised to reject other enterovirus A types), measured with Nextclade 3.30.0: 40% of real 100 nt EV-A71 fragments pass, against 93% of real 2,000 nt CVA16 fragments. The 100 nt fragment of GenBank `OQ026325` with 13 subs gets 60%: the trim removes 17 nt at the right end, and the cut drops 23 nt more. Details, measurements, and an interactive simulator: [`kb/reports/seed-cover-short-sequences.md`](../reports/seed-cover-short-sequences.md).

Divergence barely lowers the cover of long sequences, because extension stops only above 50% local mismatches with the EV-A71 parameters (`allowedMismatches` 15 of `windowSize` 30). Datasets that raise `minSeedCover` to filter divergent sequences therefore mostly filter short ones.

## Code

- Trim after the forward and the backward extension in `fn SeedMatch2.extend_seed()` ([packages/nextclade/src/align/seed_match.rs#L140-L157](../../packages/nextclade/src/align/seed_match.rs#L140-L157), [packages/nextclade/src/align/seed_match.rs#L179-L196](../../packages/nextclade/src/align/seed_match.rs#L179-L196))
- Cut into pieces in `fn SeedMatch2.extend_seed()` ([packages/nextclade/src/align/seed_match.rs#L201-L221](../../packages/nextclade/src/align/seed_match.rs#L201-L221))
- Cover check in `fn get_seed_matches2()` ([packages/nextclade/src/align/seed_match.rs#L484-L497](../../packages/nextclade/src/align/seed_match.rs#L484-L497))

## Fix

- Count the whole seed: cut it into pieces of `minMatchLength` and let the last piece take the rest (30 + 30 + 40 nt for a 100 nt seed), so the chain can use every nucleotide of the seed
- Trim only where the extension stopped because of too many mismatches. Where it reached the end of the query, drop only the mismatches at the very end

In the simulator of the report, this gives 100% cover at 13% random substitutions for every length from 100 to 2,000 nt, and raises 100 nt fragments with 30% substitutions from 48% to 78%. Seeds also place the alignment band, so alignments can change slightly in every dataset: compare the output with the current code on the test datasets before the change, and review the datasets that set `minSeedCover` above the default 0.33 after it.

## Validation

- Unit test: `fn SeedMatch2.extend_seed()` on a 100 nt query with mismatches within the last 30 nt gives pieces that cover the query up to its last match
- Unit test: a perfect 100 nt match has seed cover 1.0 with `minMatchLength` 30
- The 100 nt fragment of `OQ026325` aligns with the EV-A71 dataset at `minSeedCover` 0.79
