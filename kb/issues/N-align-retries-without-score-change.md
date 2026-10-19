# Alignment retries that cannot change the result

## Problem

`fn align_nuc()` retries the alignment with doubled band parameters while the alignment touches the band boundary, up to `maxAlignmentAttempts` (default 3) retries. A query with a long terminal overhang, for example a whole genome analyzed with a single-gene dataset, touches the boundary in the free terminal row whatever the band width: in the last matrix row, the match check and the vertical check set the `BOUNDARY` flag in every overhang cell. Such queries always use all retries, and every retry computes a larger matrix with the same result.

Measurements with the example sequences of 110 datasets of `nextclade_data`, the mpox sequences of a user report and one reported mpox fragment (4,853 aligned sequences):

- 169 sequences needed retries, 383 retries in total. 155 of the 383 retries did not raise the alignment score
- After all retries, 56 alignments still touch the boundary. 55 of them are queries much longer than a short reference with the same score in every attempt, for example all 34 examples of `nextstrain/yellow-fever/prM-E` (672 nt reference, 10-11 kb queries). Their alignments are correct
- The final band of a yellow-fever prM-E example grows from 28k to 548k cells

Since these alignments get no band-boundary warning (the last retry did not raise the score), the cost is computation time and memory only.

## Code

- Retry loop in `fn align_nuc()` ([packages/nextclade/src/align/align.rs](../../packages/nextclade/src/align/align.rs))
- Boundary flag in the last row: match check and vertical check in `fn score_matrix()` ([packages/nextclade/src/align/score_matrix.rs#L135-L137](../../packages/nextclade/src/align/score_matrix.rs#L135-L137), [packages/nextclade/src/align/score_matrix.rs#L195-L197](../../packages/nextclade/src/align/score_matrix.rs#L195-L197))

## Fix

Two changes that look like fixes make alignments worse in the same measurements:

- No boundary flag in the free terminal row: 83 alignments in 5 datasets get a lower score (by 1-63). For example, the OROV S examples have a 60 nt insertion two bases before the reference end, and a retry places the insertion better
- Stop retrying when a retry does not raise the score: 3 alignments lose a later improvement (scores of the attempts 2184, 2184, 2196 and 719, 719, 719, 720)

A fix must tell a boundary contact in the free terminal overhang from a contact that a wider band can resolve. It changes the alignment cost and possibly results, so it needs an evaluation on all dataset examples and the approval of the maintainers.
