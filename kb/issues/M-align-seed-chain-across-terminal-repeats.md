# Seed chain links both inverted terminal repeats of mpox

## Problem

The mpox genome has inverted terminal repeats: the same segment, in opposite orientations, at both ends of the genome, about 190 kb apart. A query that contains both orientations of such a segment gets seed matches at both ends of the reference. `fn chain_seeds()` scores a chain by the total length of its seeds only, so the gap between two seeds costs nothing, and the chain links the matches of both ends into one alignment with a deletion far longer than the query.

Example: a 2,480 nt mpox fragment (dataset `nextstrain/mpox/all-clades`, reference 197,209 nt). Seed matching places the first part at reference 2469-4106 and the rest at 193473-194316 and links them with one 189 kb deletion. The alignment band has 481M cells, just below the default `maxBandArea` of 500M. The result is meaningless, but it looks valid:

- CLI: coverage 0.97, QC "good", clade `Ib`, and empty-CDS warnings for almost every gene. Peak memory is about 2.8 GB
- Web: the same result, after the alignment matrix of 5 bytes per band cell fits into the 4 GiB WebAssembly memory of a worker

## Code

- Seed chaining by total seed length ([packages/nextclade/src/align/seed_match.rs#L325](../../packages/nextclade/src/align/seed_match.rs#L325))
- Band construction from the chain: `fn create_alignment_band()` ([packages/nextclade/src/align/seed_alignment.rs#L86](../../packages/nextclade/src/align/seed_alignment.rs#L86))

## Fix

Reject or penalize chains whose reference span is much longer than the query, for example by a gap cost between chained seeds or by a limit on the reference distance between consecutive seeds. Every such change can alter alignment results, also of real sequences with long deletions, so it needs an evaluation on real data of all datasets and the approval of the maintainers.
