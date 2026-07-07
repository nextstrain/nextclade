# Reduce per-sequence allocation in the recombination Viterbi decoder

## Motivation

Recombination detection runs once per query sequence, inside the parallel analysis loop (`nextclade_run_one`). For every tree-backed dataset with detection enabled, `find_recombinant_regions` decodes a Viterbi path over the full reference length. Nextclade routinely processes up to millions of sequences per run, so constant-factor cost and per-call allocation on this path are multiplied across the whole batch.

The current decoder in `packages/nextclade/src/analyze/recombination.rs` is correct and linear in reference length, but leaves two avoidable costs on that hot path:

1. A loop-invariant `ln()` is recomputed at every site. `viterbi_decode` calls `params.log_emission(obs[l])` for each of the `L` sites, and `log_emission` evaluates `.ln()` on each call. The emission log-probabilities depend only on the run-constant parameters and take four distinct values (`(1 - mu_w).ln()`, `(1 - mu_r).ln()`, `mu_w.ln()`, `mu_r.ln()`). `f64::ln` is roughly 20-50 cycles, several times the cost of the rest of the per-site body.

2. The full $L \times 2$ score matrix is retained though only the previous row is ever read. `viterbi_decode` allocates `score: vec![[f64; 2]; n]` (about 478 KB at `L = 30000`) and `back: vec![[usize; 2]; n]`. The forward recursion reads only `score[l - 1]`; the backtrace starts from `score[n - 1]`. The full score history is never revisited, so a two-row rolling window suffices. Only `back` genuinely needs full length, and it stores a one-bit state in a `usize`, eight times wider than needed.

## Background

`viterbi_decode` (`packages/nextclade/src/analyze/recombination.rs`):

- `let mut score = vec![[f64::NEG_INFINITY; 2]; n];` then the forward loop reads `score[l - 1]` and writes `score[l]`.
- `let mut back = vec![[WILDTYPE; 2]; n];` is walked in reverse during backtrace and needs full length.
- `RecombinationObs` already derives `#[repr(u8)]`, so `obs as usize` is a free index into a precomputed emission table.

## Options

These are independent axes; any subset can be adopted.

### Axis A: emission-log computation

- A1. Precompute a `[[f64; 2]; 3]` table once at the top of `viterbi_decode`, indexed by `obs as usize`, and look it up in the loop. Uses the existing `#[repr(u8)]`. Removes the per-site `ln`.
- A2. Hoist the four scalar `ln` values into locals and match inline. Same effect, no table type.
- A3. Keep as-is.

Recommended: A1. It is the smallest change, self-documenting, and makes the existing `#[repr(u8)]` load-bearing rather than decorative.

### Axis B: score storage

- B1. Replace the full `score` matrix with two `[f64; 2]` rows (`prev`, `cur`) swapped each iteration; keep `back` full-length. Backtrace starts from the final `cur`. Behavior is bit-identical; removes one $O(L)$ allocation and the cache pressure of streaming a large array.
- B2. Keep the full matrix.

Recommended: B1.

### Axis C: backpointer width

- C1. Store `back` as `Vec<[u8; 2]>` (values 0/1), shrinking it about 8x. Small absolute effect; only matters once B1 lands and `back` is the sole full-length array.
- C2. Keep `[usize; 2]`.

Recommended: C1, but only with a measurement confirming the backtrace is cache-bound; low priority.

## Scope

- `packages/nextclade/src/analyze/recombination.rs`: `viterbi_decode` only. No change to the public interface, outputs, or decoded result.

## Validation

- The existing decoder unit tests assert exact intervals and must stay green unchanged (the optimizations are behavior-preserving).
- Add a Criterion microbenchmark for `find_recombinant_regions` at representative lengths (10k, 30k, 100k) comparing before and after, and a heap profile (dhat) confirming the `score` allocation is gone.

## Related

- Estimator cost is out of scope: `estimate_mu_r` is $O(\text{clades}^2 \cdot \text{depth})$ but runs once per run in `Nextclade::new`, not per sequence.
