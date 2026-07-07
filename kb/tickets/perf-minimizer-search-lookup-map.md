# Speed up minimizer-search lookups with a hash map

## Motivation

Raising a dataset's `minimizerIndex.cutoff` forces the global `params.cutoff` in the shared minimizer index up to the maximum across all datasets (the client hashes each query once, before it knows which dataset matches, so it must hash at the widest cutoff any dataset needs). A wider global cutoff makes the `sort` dataset-suggestion step slower for every query and every dataset, not just the one that requested the wider cutoff. PR [#1772](https://github.com/nextstrain/nextclade/pull/1772) reported +67% sort runtime for a global cutoff of `1<<31` and asked where the time goes; a PR review comment (rneher) asked specifically whether the larger span of map keys makes lookups less efficient.

This ticket records the profiling result and proposes the remaining optimization. The two dominant costs (the SipHash dedup and the per-hit reference scan) were already fixed; see "Resolved on this branch". The remaining item is the map lookup itself.

## Profiling result

Measured with a criterion benchmark isolating `run_minimizer_search` from CLI startup and IO, over a mixed 235-sequence query set against the real production index (103 references, 44508 entries, k=17). The index is identical between the two columns; only the global `params.cutoff` differs (`1<<28` vs `1<<31`), which is exactly what one dataset raising its cutoff produces. Attribution splits the per-query cost into the hashing/dedup stage (`get_ref_search_minimizers`) and the map-lookup + hit-count stage.

Baseline (before the fixes on this branch), per full query set:

| Stage                  | cutoff 1<<28 | cutoff 1<<31 | delta    |
| ---------------------- | ------------ | ------------ | -------- |
| hashing + dedup        | 351.8 ms     | 432.5 ms     | +80.7 ms |
| map lookup + hit count | 94.7 ms      | 103.3 ms     | +8.6 ms  |
| full search            | 446.5 ms     | 535.8 ms     | +89.3 ms |

Key finding, correcting the hypothesis in the PR comment thread: the wider-cutoff slowdown is **not** dominated by extra `BTreeMap::get` lookups. 90% of the added cost (+80.7 of +89.3 ms) is in `get_ref_search_minimizers`. The k-mer hashing there runs for every k-mer regardless of cutoff, so the cutoff-scaling cost was the handling of the ~8x more surviving minimizers: `Itertools::unique`, which allocates a SipHash-keyed `HashSet` to deduplicate.

The extra `BTreeMap` lookups the PR comment worried about are real but secondary. They were masked in the baseline by an even more expensive per-hit reference scan; once that scan is removed (see below), the pure lookup cost of the extra (mostly missing) c31 query k-mers becomes visible at roughly +30 ms, and an isolated comparison shows a `HashMap` view resolves them ~44% faster than the `BTreeMap` (53.6 ms vs 30.1 ms for the c31 lookup stage).

### Confirmed with a sampling profiler

Cross-checked with `samply`/`perf` on the host (`dev/profile`, `profiling` cargo profile), sampling the single-threaded `sort` on the c31 workload. Inclusive share of total samples, `run_minimizer_search` at ~95%:

| Symbol                                                | pre-fix | post-fix |
| ----------------------------------------------------- | ------- | -------- |
| `get_ref_search_minimizers`                           | 75%     | 81%      |
| `get_hash` (per-k-mer hashing, incl. char membership) | 57%     | 72%      |
| `Itertools::unique` dedup (SipHash `HashSet`)         | 14%     | 0%       |
| ...of which `hashbrown` resize/rehash                 | 9%      | -        |
| ...of which `SipHash` hashing                         | 6%      | -        |
| sort + dedup (`quicksort`), post-fix replacement      | -       | 5%       |
| `BTreeMap::get` (map lookup)                          | 10%     | 12%      |

The profiler localizes the pre-fix dedup cost concretely: the SipHash `HashSet` behind `Itertools::unique` spends most of its time in `hashbrown` reserve/rehash as it grows to hold the ~8x more surviving minimizers at the wider cutoff. Post-fix these symbols are absent, replaced by a ~5% `quicksort`. It also confirms `BTreeMap::get` is a stable ~10-12% (secondary, not the driver), and that the remaining dominant cost is the intrinsic per-k-mer `get_hash` -- which is cutoff-independent and is the target of the unmerged bit-packing work in PR [#1649](https://github.com/nextstrain/nextclade/pull/1649).

## Resolved on this branch

Both are correctness-preserving (byte-identical `sort` output on the 235-sequence set for both cutoffs, verified against a captured baseline) and are covered by unit tests in `packages/nextclade/src/sort/minimizer_search.rs`.

1. Dedup query minimizers via `sort_unstable` + `dedup` instead of `Itertools::unique`. Removes the SipHash `HashSet` allocation. Cut the wider-cutoff hashing-stage penalty from ~80 ms to ~31 ms; the consumer needs only the distinct set, so iteration order is irrelevant.
2. Count hits by iterating the references stored in each matched map entry, instead of scanning all `n_refs` and testing `Vec::contains` per entry (`O(n_refs * mz.len())` per hit, reduced to `O(mz.len())`). Cut the hit-count cost ~75%.

Combined: full search -18% at cutoff 1<<28 and -22% at cutoff 1<<31; the wider-cutoff penalty dropped from +89 ms to +54 ms.

## Proposal: hash-map lookups

Replace the `BTreeMap<u64, Vec<usize>>` lookups in `run_minimizer_search` with a hash map. On `u64` hash keys this turns each lookup from `O(log N)` (with cache-unfriendly tree traversal) into `O(1)`, and directly addresses both the extra c31 misses and the review comment about key-span. An isolated benchmark measured -44% on the c31 lookup stage even with the standard-library SipHash map; a faster hasher (`rustc-hash` / `FxHashMap`) on these trusted keys would improve on that.

The serialized index format must stay deterministic (sorted keys, so dataset builds are reproducible and diffable), so the on-disk `MinimizerMap = BTreeMap<u64, Vec<usize>>` and its custom serializer are kept. The hash map is a search-time view only.

Design axes (independent choices):

- **Hasher**: standard-library `HashMap` (no new dependency, SipHash, already -44%) vs `FxHashMap` from `rustc-hash` (faster on `u64`, adds a workspace dependency; justified for a profiled hot path with trusted keys).
- **Ownership**: the WASM caller (`packages/nextclade-web/src/wasm/seq_autodetect.rs:82`) holds the index in a long-lived struct and calls `run_minimizer_search` per record. A borrowed view (`HashMap<u64, &[usize]>`) built once would be self-referential with the stored index. Options: (a) store an owned `HashMap<u64, Vec<usize>>` search view built at load and search against it (one-time O(N) clone of the small per-hash vectors); (b) restructure so the index and its search view are constructed together and the view borrows; (c) build the view once per `sort` run in the CLI/WASM caller and pass it into `run_minimizer_search` as a parameter.

Cross-repo note: `MinimizerMap` is defined in the `nextclade` crate and consumed by the `nextclade_data` builder. Keeping the on-disk type unchanged confines this change to the `nextclade` repo. Changing the stored type would require coordinated `nextclade_data` changes.

## Per-dataset cutoff feasibility

PR #1772 sets the global cutoff to `max(all per-dataset cutoffs)` and notes it could not scope the client cost to the requesting dataset. This is structurally unavoidable: the client hashes each query once, before dataset assignment, so it must hash at the widest cutoff any dataset needs. The stored index already enforces per-dataset cutoffs correctly (each dataset stores only hashes below its own cutoff, so a query hash above a dataset's cutoff never hits it), so results are already correct; only the client-side hashing volume is global.

The practical consequence changes with the profiling result: the global client cost was dominated by the SipHash dedup, not by anything fundamental to hashing more k-mers. With that removed, the residual wider-cutoff penalty is small, and the hash-map lookup proposal removes most of what remains. Per-dataset scoping of the client cost is therefore not necessary to make wider cutoffs cheap.

## Verification

- Criterion benchmark `packages/nextclade/benches/bench_minimizer_search.rs` (self-contained, deterministic synthetic data). Splits hashing vs lookup and compares `BTreeMap` vs `HashMap` lookups; re-run before and after any lookup change.
- `sort` output must remain byte-identical across the change for both cutoffs (capture a baseline TSV on a mixed query set and diff).

## Related

- PR [#1772](https://github.com/nextstrain/nextclade/pull/1772) - per-dataset minimizer cutoff exponent (this branch's base)
- PR [#1649](https://github.com/nextstrain/nextclade/pull/1649) - earlier sort-perf work (bit-packed k-mer conversion), not merged
