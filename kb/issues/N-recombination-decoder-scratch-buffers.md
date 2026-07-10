# Per-sequence decoder scratch buffers and oversize backpointers need a designed solution

> Performance plus design concern, not a correctness defect. The local buffer wins are clean; the cross-sequence reuse that would remove the rest invites a stateful, global design that the codebase avoids.

## Problem

`run_recombination` (`packages/nextclade/src/analyze/recombination/run.rs`) allocates several reference-length buffers per sequence, then frees them immediately:

- `obs: Vec<RecombinationObs>` (`observations.rs`)
- `score: Vec<[f64; 2]>` and `back: Vec<[usize; 2]>` (`decode.rs`)
- `is_recombinant: Vec<bool>` (`decode.rs`)
- `log_alpha`, `log_beta`, `posteriors: Vec<[f64; 2]>` (`forward_backward.rs`, only when a region is found)

The decode path runs once per query sequence on a rayon worker, for up to millions of sequences per run, so this is sustained allocate-and-free traffic and cache pollution on a hot path. Two distinct costs:

1. The full `L x 2` `score` matrix is retained though the forward recursion reads only the previous row and the backtrace starts from the last row.
2. `back` stores a two-valued backpointer as `[usize; 2]` (16 bytes per site) where the value is one of two states.

Peak per-sequence memory here is also relevant to `kb/issues/H-wasm-oom-large-genomes.md`.

## Goal

Cut the per-sequence allocation and per-site footprint on the decode path without introducing global mutable state or hidden temporal coupling (reset-between-uses on a shared buffer). Prefer behavior-preserving changes with local ownership; reach for cross-sequence reuse only if profiling shows it is needed, and only via explicit ownership.

## Design options

### Axis A: local, behavior-preserving buffer shape (clean)

- A1. Replace the full `score` matrix with a rolling two-row window (`prev` / `cur` swapped each iteration); keep `back` full-length, backtrace from the final row. Removes one `O(L)` allocation, bit-identical output.
- A2. Store `back` as `[u8; 2]` or `[HiddenState; 2]` (values 0/1) instead of `[usize; 2]`, shrinking it about 8x. Most relevant once A1 lands and `back` is the only full-length array.

Both are self-contained in `decode.rs`, no statefulness.

### Axis B: cross-sequence buffer reuse (the part needing thought)

- B1. Do nothing beyond Axis A, and measure. After the rolling window, the residual per-sequence allocations are `obs` (one byte per site), `back` (two bytes per site with A2), `is_recombinant`, and the forward-backward buffers (only for sequences with a decoded region). These may be small enough that pooling is not worth its complexity.
- B2. An explicit reusable scratch struct (`RecombinationScratch`) owned by the per-sequence analysis context and passed as `&mut` into `run_recombination`, cleared between sequences. No globals; ownership is explicit; the reset is contained behind a typed method. Cost: threads scratch through `nextclade_run_one` and the worker.
- B3. A `thread_local!` per-worker scratch. Rejected: global mutable state plus hidden temporal coupling, hard to test, contrary to the project's no-global-mutable-state and no-temporal-coupling rules. Listed only to be explicitly ruled out.

## Recommendation

A1 and A2 as the clean local wins. For cross-sequence reuse, take B1 first (measure after A1 removes the large `score` allocation) and adopt B2 only if profiling shows the residual per-sequence allocation is a real bottleneck. Never B3.

## Scope

- `packages/nextclade/src/analyze/recombination/decode.rs` for Axis A. The B2 variant also threads a scratch type through `run.rs`, `packages/nextclade/src/run/nextclade_run_one.rs`, and the per-sequence state. Behavior-preserving; no output or schema change.

## Validation

- Existing decoder and forward-backward unit tests, the brute-force oracles, and the golden master must stay green unchanged.
- A heap profile (`dhat` or `heaptrack`) before and after, showing the `score` allocation gone (A1) and `back` shrunk (A2); a throughput benchmark at high worker count to confirm reduced allocator contention.

## Related

- Overlaps `kb/proposals/perf-recombination-decoder.md` Axes B (rolling score window) and C (`u8` backpointers).
- Complements `kb/issues/N-recombination-emission-log-table.md` (the emission-log precompute on the same decode path).
- Bears on `kb/issues/H-wasm-oom-large-genomes.md` (per-sequence peak memory in the single-threaded wasm build).
