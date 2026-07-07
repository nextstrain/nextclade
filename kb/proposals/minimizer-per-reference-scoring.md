# Per-reference minimizer scoring

## Background

Nextclade's minimizer search scores query sequences against datasets using a per-organism index: k-mers from all references of a dataset are merged by set union into one entry. This creates a denominator inflation problem when datasets have multiple references (see [report](../reports/minimizer-scoring-approaches.md)).

The current fix -- per-organism scoring with an analytic single-reference denominator, referred to as S1 below -- keeps the per-organism architecture and replaces the denominator with an analytic estimate of single-reference expected hits. This is the agreed approach for the near term.

This proposal evaluates switching to per-reference scoring as a longer-term alternative.

## Motivation

Per-reference scoring eliminates the denominator estimation entirely. Each reference has its exact k-mer count as the denominator. No formula, no approximation, no need to reason about expected vs actual counts.

It also provides per-reference diagnostic output: instead of "this query matches organism X", the system reports "this query is closest to reference Y of organism X". This is useful for sub-typing and lineage assignment within datasets.

## Design

### Index changes (`minimizer.json`)

Add a `dataset` field to each reference entry, alongside the existing `name`:

```json
{
  "references": [
    { "name": "CVA16_ref1", "dataset": "nextstrain/enterovirus/cva16", "length": 7410, "nMinimizers": 437 },
    { "name": "CVA16_ref2", "dataset": "nextstrain/enterovirus/cva16", "length": 7395, "nMinimizers": 431 },
    { "name": "EV71_ref1", "dataset": "nextstrain/enterovirus/ev71", "length": 7408, "nMinimizers": 435 }
  ]
}
```

Current behavior: `name` is the dataset/organism name. Proposed: `name` is the reference identifier, `dataset` is the organism.

### Rust consumer changes (`minimizer_search.rs`)

After scoring all entries independently (no change to the scoring loop), add a grouping step:

1. Score all reference entries as today
2. Group results by `dataset`
3. Per dataset, report the best-scoring reference as the dataset's score
4. Apply `min_score`, `min_hits`, `max_score_gap` filters at the dataset level

The `MinimizerSearchDatasetResult` struct gains an optional `best_reference: Option<String>` field for diagnostic output.

### Python producer changes (`minimizer.py`)

`make_ref_search_index()` creates one entry per reference instead of merging. Each entry carries its own k-mer set, length, and exact minimizer count plus the parent dataset name.

### Backward compatibility

Existing single-reference datasets: `dataset` defaults to `name` when absent. Existing Rust consumers that don't know about `dataset` treat each reference as a separate dataset (functionally identical to current behavior for single-reference datasets, produces duplicate dataset names for multi-reference -- harmless but noisy).

New field `dataset` is additive. Old `nMinimizers` retains its current meaning (exact count per entry). No field reinterpretation needed.

## Unresolved: intermediate strain robustness

Per-organism union scoring accumulates hits from all references toward one score. A query intermediate between two references of the same organism benefits from partial k-mer overlap with both. Per-reference scoring loses this: the query scores poorly against each reference individually.

Possible mitigations:

1. **Max-of-references** (proposed above): simple, but loses the union benefit entirely
2. **Sum-of-hits across references, divided by mean per-reference count**: restores accumulation, but reintroduces aggregation complexity
3. **Best-of-references with a dataset-level hit bonus**: ad hoc

None of these fully replicate the union behavior. For enteroviruses with high within-type diversity, this is a real concern. The severity depends on how much k-mer overlap exists between references of the same organism -- if references are divergent enough that their k-mer sets barely overlap, the union benefit is small and per-reference max is sufficient.

Empirical evaluation needed: compare per-organism (with S1 fix) vs per-reference (max) on CVA16 test sequences to measure how many intermediate strains are misassigned.

## Unresolved: reference count bias

A dataset with 10 references gets 10 independent chances to be the max. The expected max of 10 i.i.d. noisy scores is higher than the expected max of 1. This systematically favors datasets with more references.

Possible mitigations:

1. Normalize by log(N_references) -- reduces bias but introduces a new tuning parameter
2. Use median instead of max -- loses sensitivity
3. Accept the bias as intentional (more references = better coverage = should score higher)

Option 3 is defensible if the intent is "datasets with better reference coverage should win", but creates an arms race where adding references improves assignment independently of actual similarity.

## Validation plan

1. Build both index variants (per-organism with S1 fix, per-reference) from `feat/multiref` CVA16 data
2. Run `scripts/minimizer search` on CVA16 test sequences with each index
3. Compare: unclassified count, assignment accuracy (where known), score distributions
4. Repeat for existing single-reference datasets (SC2, RSV, flu) to verify no regression
5. Test with synthetic intermediate sequences (equal distance between two references) to probe the union vs max tradeoff

## Recommendation

Ship S1 (per-organism with denominator fix) now. It addresses the immediate problem entirely on the data side, without changing the per-organism index architecture, and preserves intermediate strain robustness.

Evaluate per-reference scoring empirically using the validation plan above. If the intermediate strain concern proves minor for real enterovirus data, per-reference scoring is cleaner and provides better diagnostics. If intermediates are commonly misassigned, per-organism union is the correct architecture and the denominator fix is the long-term solution.

## References

- Full comparison: [kb/reports/minimizer-scoring-approaches.md](../reports/minimizer-scoring-approaches.md)
- Scoring code: [`minimizer_search.rs:40-106`](../../packages/nextclade/src/sort/minimizer_search.rs#L40-L106)
- Index struct: [`minimizer_index.rs:82-91`](../../packages/nextclade/src/sort/minimizer_index.rs#L82-L91)
- Python builder: [`nextclade_data` `scripts/lib/minimizer.py`](https://github.com/nextstrain/nextclade_data/blob/33c14bdc/scripts/lib/minimizer.py)
- Loculus tool: [loculus-project/nextclade-sort-minimizers](https://github.com/loculus-project/nextclade-sort-minimizers)
- Meeting notes: Nextclade multi-reference and minimizer design meeting
