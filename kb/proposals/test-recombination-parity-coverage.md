# Recombination detection: reference-parity and higher-level test coverage

## Motivation

The recombination decoder and estimator carry sound unit tests with independently derived oracles (analytic nat-budget reasoning for the Viterbi cases, hand-computed tree arithmetic for the estimator). Three consequential kinds of coverage are still missing, each guarding a different failure mode:

1. The decoder is a port of an existing reference implementation. A porting defect (transposed transition, tie-break flip, off-by-one in backtrace) can pass the hand-authored dense-block cases while diverging from the reference. A brute-force optimality oracle over all hidden paths now pins the recurrence, initialization, and tie policy (Axis A2, implemented); equivalence to the specific reference implementation (Axis A1) is still unverified.

2. Interval extraction has structural invariants (sorted, disjoint, in-bounds, half-open, endpoints on covered positions). These are now covered by a property test over random observation vectors and parameters plus a metamorphic all-`Ref` case (Axis B1, implemented).

3. The feature's user-visible surface (per-sequence output through `nextclade_run_one`, JSON/CSV columns, and the web viewer marker) has no end-to-end coverage. The decoder can be correct while the pipeline reports nothing, uses the wrong mutation source, or the viewer drops the marker (Axis C and D, still open).

## Background

Current tests live in `packages/nextclade/src/analyze/recombination.rs` and `recombination_estimate.rs` as inline unit tests, including property tests, a metamorphic case, a brute-force Viterbi optimality oracle, and forward-backward marginal checks. Still missing: golden-master parity against the reference implementation, pipeline integration through `nextclade_run_one`, a CLI output snapshot, and a web end-to-end test. On fully covered (binary) input the Rust `Missing` branch never fires, so decoder outputs must match the reference exactly.

## Options

These are independent axes; adopt any subset.

### Axis A: reference parity

- A1. Golden master against the Python prototype. Run `viterbi_recombination.py` offline on chosen binary vectors (including the notes' `mu_w=0.005, mu_r=0.05, gamma=0.0005` example), commit the decoded state vectors as a fixture, and assert the Rust decoder reproduces them. The capture must import and run the actual prototype, never re-implement it. Directly validates the port claim.
- A2. Brute-force oracle. For short vectors (`L <= 12`), enumerate all `2^L` hidden paths and confirm Viterbi returns the maximum-probability path. Independent of the prototype; covers tie-breaking explicitly. **Implemented** (`test_recombination_viterbi_matches_bruteforce_oracle`).
- A3. Both. A1 pins equivalence to the validated reference; A2 pins optimality and tie policy without an external artifact.

Recommended: A3. A2 is implemented; A1 (golden master against the reference) remains the highest-value open item.

### Axis A-fb: forward-backward reference parity

- A-fb1. Golden master against the Python prototype's `forward_backward_recombination_logexp`. Run the prototype on fixed binary vectors, commit per-site marginal arrays as fixtures, assert Rust `forward_backward_marginals` reproduces them. Same capture discipline as A1.
- A-fb2. Analytic oracle for trivial two-site or three-site HMMs where marginals can be computed by hand.

Recommended: A-fb1. Deferred pending golden master capture infrastructure.

Status: **deferred** -- forward-backward unit tests (marginals bounded, sum to 1, dense block shape, Missing bridging) and a property test (marginals in [0,1] for random inputs) are implemented. Golden master parity against the prototype is the remaining item.

### Axis B: property tests

- B1. Random observation vectors and valid random parameters, asserting every returned interval is sorted, disjoint, non-empty, within bounds, and endpoints are covered, plus a metamorphic case (an all-`Ref` vector yields no regions). **Implemented** (`test_prop_recombination_regions_well_formed`, `test_recombination_metamorphic_all_ref_yields_no_regions`).
- B2. Forward-backward marginals bounded in [0, 1] for random observations and valid random parameters. **Implemented**.

Recommended: B1 + B2. Both implemented.

### Axis C: pipeline integration

- C1. An in-process test building a minimal `Nextclade` state and one crafted query with a known dense private-mutation block, asserting the resulting `RecombinationResult` (regions and summaries) and its absence when disabled, tree-less, or unresolved. Guards the observation wiring (private substitutions as `Mut`; missing, non-ACGTN, and deletions as `Missing`).
- C2. A CLI golden-master/snapshot on a small multi-clade dataset asserting the `recombination.*` output columns (`regions`, `regionConfidences`, `totalRegions`, `totalLength`, `longestRegion.range`, `longestRegion.length`), the `recombinationParams` block, and a representative row.

Recommended: C1, plus C2 to lock the public output contract (the `recombination.*` columns are on by default, so they ship in every user's tabular output).

### Axis D: web viewer

- D1. A Playwright end-to-end test with an analysis result containing a recombinant interval, asserting the marker renders in the parent/absolute view with the coordinate tooltip and without gene or codon labels, and that markers count toward the too-many-markers threshold.

Recommended: D1.

## Scope

- Test-only. `__tests__`/inline Rust tests, a committed golden fixture under the test tree, and a Playwright spec under `packages/nextclade-web/tests/e2e`.
- A1 requires a one-time capture step that runs the prototype; document the prototype commit used as the oracle in the fixture.

## Validation

Each added test must be shown to fail against a deliberately seeded defect (wrong tie-break, wrong mutation source, dropped marker) before being trusted.
