# Minimizer scoring: per-organism vs per-reference

## Context

Nextclade's `nextclade sort` assigns query sequences to datasets using a minimizer-based search. Each dataset's reference sequence(s) are hashed into k-mers, filtered by a hash threshold (cutoff), and stored in a shared index (`minimizer.json`). A query sequence's k-mers are looked up in this index to count hits per dataset, then normalized into a score.

Two architectures exist for this scoring:

- **Per-organism** (Nextclade's current design): one index entry per dataset, k-mers from all references merged
- **Per-reference** (Anya's Loculus tool): one index entry per individual reference sequence

This report analyzes the tradeoffs between them.

## Per-organism scoring (current)

### Index structure

Each dataset/organism occupies one entry in `minimizer.json`. When a dataset has multiple references, their k-mers are merged by set union into a single entry. The entry stores:

- `name`: dataset identifier
- `length`: reference length (average across references in multi-ref case)
- `nMinimizers`: total unique k-mers in the merged set

Code: `make_ref_search_index()` in `nextclade_data` `scripts/lib/minimizer.py`.

### Scoring formula

Per dataset $i$ ([`minimizer_search.rs:68`](../../packages/nextclade/src/sort/minimizer_search.rs#L68)):

$$\text{score}_i = \frac{\text{qry\_hits}_i}{\text{nMinimizers}_i} \cdot \max\!\left(\frac{\text{ref\_len}_i}{\text{qry\_len}},\; 1.0\right)$$

The first factor is the fraction of the dataset's k-mers that appear in the query. The second compensates for queries shorter than the reference (partial sequences score fairly).

### Multi-reference problem

When k-mers from $N$ references are merged, `nMinimizers` is the union size. A query resembling reference A hits A's k-mers but not k-mers unique to references B, C, etc. The denominator grows with each added reference while the numerator stays roughly constant. Scores decrease as references are added -- the opposite of the intended effect.

Empirical evidence: adding two references for the same CVA16 clade decreased successful matches compared to a single reference ([PR 404 discussion](https://github.com/nextstrain/nextclade_data/pull/404)).

### Proposed fix (S1 in implementation plan)

Replace `nMinimizers` (union size) with the expected hit count for a single reference:

$$E = \text{avg\_ref\_length} \cdot \frac{\text{cutoff}}{2^{32}}$$

This uses the hash acceptance fraction (`cutoff / 2^32`) to predict how many k-mers a single reference contributes. The union still stores all k-mers (so any reference's k-mers can match), but the normalization denominator reflects one reference's contribution.

## Per-reference scoring (Anya's Loculus approach)

### Index structure

Each individual reference sequence is a separate entry. A dataset with 5 references produces 5 index entries, each with its own k-mer set, length, and minimizer count. Dataset assignment is a metadata lookup after scoring.

Tool: [loculus-project/nextclade-sort-minimizers](https://github.com/loculus-project/nextclade-sort-minimizers). This tool generates the `minimizer.json` index; scoring is performed by `nextclade sort` using the same Rust code. The difference is entirely in how the index is constructed.

### Scoring

The same Nextclade formula applies. Each reference has its own exact k-mer count as the denominator -- no estimation or approximation needed. The best-scoring reference determines which dataset the query is assigned to.

### No multi-reference problem

Since each reference is scored independently with its own actual k-mer count, adding references cannot inflate any denominator. The per-reference denominator is always exact.

## Comparison

### Intermediate strain behavior

The central tradeoff involves queries that fall between two references of the same organism.

**Per-organism (union):** k-mers from all references are pooled. A query intermediate between references A and B hits some of A's k-mers and some of B's. All hits count toward the organism's score. The union acts as a wider net, capturing queries that partially match multiple references.

**Per-reference:** the query scores against A and B independently. It matches neither well (missing k-mers specific to each). The best single-reference score may be lower than a competitor organism's score. The query could be misassigned.

This is the strongest argument for per-organism scoring: enteroviruses (the motivating use case) have high within-type diversity, which is the reason for adding multiple references in the first place.

### Reference count bias

**Per-organism:** one score per dataset regardless of reference count. Fair comparison between a dataset with 1 reference and one with 10.

**Per-reference:** a dataset with 10 references gets 10 independent scores. Taking the max over 10 noisy estimates is statistically higher than the max over 1, even for equal underlying quality. This systematically favors datasets with more references. Mitigation requires post-hoc grouping and normalization per organism -- reintroducing the aggregation logic per-organism avoids.

### Denominator accuracy

**Per-organism (with fix):** the denominator $E$ is an analytic approximation. It ignores:

- Non-ACGT k-mers dropped by `get_hash()` (`minimizer.py:44`)
- Hash collisions removed by deduplication
- K-mers spanning sequence boundaries

The error is small (a few percent for typical genome lengths) but non-zero. An alternative (P1 in the implementation plan) proposes using the mean of actual per-reference counts, which is exact.

**Per-reference:** denominator is the literal k-mer count for that reference. Always exact.

### Index size

**Per-organism:** $M$ entries (one per dataset). K-mers deduplicated across references.

**Per-reference:** $\sum_i N_i$ entries, where $N_i$ is the number of references for dataset $i$. K-mers may be duplicated across entries for the same organism.

For current Nextclade datasets (mostly single-reference), the sizes are identical. For multi-reference enteroviruses with 3-5 references per type, the per-reference index is 3-5x larger in entry count but k-mer storage depends on inter-reference divergence.

### Diagnostic information

**Per-organism:** reports which dataset matched. Does not identify which reference within the dataset the query is closest to.

**Per-reference:** reports which specific reference matched. Useful for sub-typing, lineage assignment within a dataset, and debugging assignment problems.

### Schema and compatibility

**Per-organism:** current `minimizer.json` schema. No changes to Rust consumer code for the denominator fix (S1). Compatible with all existing Nextclade versions.

**Per-reference:** requires a new field mapping references to organisms (currently `name` = organism, would need `name` = reference + `organism` = parent dataset). Existing Rust code would treat each reference as a separate dataset, which produces incorrect `--all-matches` output and confuses downstream consumers expecting organism-level results.

## Summary

| Aspect                 | Per-organism (with fix) | Per-reference         |
| ---------------------- | ----------------------- | --------------------- |
| Intermediate strains   | robust (union net)      | brittle (individual)  |
| Reference count bias   | none                    | systematic (max-of-N) |
| Denominator accuracy   | approximate             | exact                 |
| Diagnostic granularity | organism only           | per-reference         |
| Index size             | compact                 | larger                |
| Schema compatibility   | no change               | requires new fields   |
| Changes required       | data-side only          | both Rust and data    |

## References

- Nextclade scoring: [`minimizer_search.rs:40-106`](../../packages/nextclade/src/sort/minimizer_search.rs#L40-L106)
- Index structure: [`minimizer_index.rs:82-91`](../../packages/nextclade/src/sort/minimizer_index.rs#L82-L91)
- Python index builder: [`nextclade_data` `scripts/lib/minimizer.py`](https://github.com/nextstrain/nextclade_data/blob/33c14bdc/scripts/lib/minimizer.py)
- Loculus tool: [loculus-project/nextclade-sort-minimizers](https://github.com/loculus-project/nextclade-sort-minimizers)
- Multi-reference PR: [nextstrain/nextclade_data#404](https://github.com/nextstrain/nextclade_data/pull/404)
- CVA16 cutoff experiment: [nextstrain/nextclade_data@76bec36b](https://github.com/nextstrain/nextclade_data/commit/76bec36b)
