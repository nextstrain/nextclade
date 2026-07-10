# Emission log-probability precompute needs a modeled type, not a raw `[[f64; 2]; 3]` table

> Performance plus design concern, not a correctness defect. The per-site recompute is a hot-path constant factor; the obvious fix is an un-modeled array that deepens an existing typing smell.

## Problem

Two coupled issues on the per-sequence decode path.

1. Performance. `RecombinationHmmParams::compute_log_emission` (`packages/nextclade/src/analyze/recombination/params.rs`) evaluates `.ln()` on every call, and both the Viterbi decoder (`decode.rs`) and forward-backward (`forward_backward.rs`) call it once per reference site. The emission log-probabilities are run-constant (four distinct values: `(1 - mu_w).ln()`, `(1 - mu_r).ln()`, `mu_w.ln()`, `mu_r.ln()`), so this is a loop-invariant transcendental recomputed `L` times per sequence, multiplied across up to millions of sequences per run.

2. Design. The obvious fix, precompute a `[[f64; 2]; 3]` table indexed by `obs as usize` (recommended as Axis A in `kb/proposals/perf-recombination-decoder.md`), is ad-hoc: an unnamed nested array, positional columns, and an `enum as usize` cast that silently couples the array layout to the `#[repr(u8)]` variant order of `RecombinationObs`. The same untyped pattern already pervades the decoder, where hidden states are `WILDTYPE: usize = 0` / `RECOMBINANT: usize = 1` consts indexing `[f64; 2]` / `[usize; 2]` pairs across `params.rs`, `decode.rs`, and `forward_backward.rs`. Adding a third magic array deepens that smell rather than paying it down.

## Goal

Remove the per-site `ln()` without introducing positional arrays or enum-to-index casts. Model emission scores and hidden states as named types so the precompute is correct by construction and the decoder reads self-documenting.

## Design options

### Axis A: emission-score representation

- A1. `struct EmissionScores { wildtype: f64, recombinant: f64 }` (named fields) replacing the positional `[f64; 2]`. The emission lookup returns this; the decoder reads `.wildtype` / `.recombinant`.
- A2. Introduce a `HiddenState` enum `{ Wildtype, Recombinant }` and index scores by it (a small `Index<HiddenState>` impl or `EnumMap<HiddenState, f64>`), retiring the `WILDTYPE` / `RECOMBINANT` `usize` consts and the `[f64; 2]` pairs throughout decode and forward-backward. Larger blast radius; removes all magic state indices, not just the emission ones.

### Axis B: where the precomputed emissions live

- B1. A dedicated `LogEmissions` value built once per decode from the params (`LogEmissions::from_params(&params)`), with `fn for_obs(&self, RecombinationObs) -> EmissionScores`. Params stay pure validated data; four `ln()` per sequence (negligible against `L` sites).
- B2. Fold a precomputed `LogEmissions` into `RecombinationHmmParams` as a private derived field, filled in `new()` after validation (complete construction). Eliminates even the per-sequence recompute; the params type stays `Copy`. Cost: it carries derived state, kept in sync only by the sole constructor.

### Axis C: observation-to-emission mapping

- C1. Exhaustive `match` on `RecombinationObs` (compiler-checked completeness, no cast).
- C2. `EnumMap<RecombinationObs, EmissionScores>` (the `enum-map` crate): type-safe keyed lookup with compile-time completeness and no `as usize`.

## Recommendation

B1 + A1 + C1 as the minimal clean core: a `LogEmissions` type holding three named `EmissionScores`, built once per decode, matched by observation. Adopt A2 (the `HiddenState` enum) if the wider refactor to purge `usize` state indices from the decoder is taken in the same pass. Avoid the raw `[[f64; 2]; 3]` table regardless of which combination is chosen.

## Scope

- `packages/nextclade/src/analyze/recombination/params.rs` (emission computation, and the params type under B2), `decode.rs`, and `forward_backward.rs`. Behavior-preserving; no output or schema change. The A2 variant also touches the `WILDTYPE` / `RECOMBINANT` consts and their uses in decode, forward-backward, and the test helpers.

## Validation

- Existing decoder and forward-backward unit tests, the brute-force oracles, and the golden master must stay green unchanged (the refactor is behavior-preserving).
- A Criterion microbenchmark for `find_recombinant_regions` at 10k / 30k / 100k sites confirming the per-site `ln()` is gone; a flamegraph should show `libm ln` absent from the recombination frames.

## Related

- Refines `kb/proposals/perf-recombination-decoder.md` Axis A, which recommends the raw `[[f64; 2]; 3]` table this issue rejects. The proposal's Axis B (rolling two-row score window) and Axis C (`u8` backpointers) are independent and unaffected.
