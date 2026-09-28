# Mutation pattern motifs of unbounded length are accepted

## Problem

A mutation pattern motif can contain repetitions without an upper bound: `*`, `+` and `{n,}`. Two problems follow.

**Greedy repetitions skip sites.** A motif site is the leftmost-first match anchored at a start position. For a greedy repetition, this is the longest match. With `.*(C)G`, the match from every start position extends to the last CpG of the genome, so only the C of that one CpG is a site. The lazy form `.*?(C)G` finds every CpG. Authors are unlikely to expect this difference.

**The search cost can hang the analysis.** Nextclade searches each substitution for sites that start up to the maximum motif length before it. Without a maximum length, the search starts at position 0, and each anchored search can read to the end of the genome. The cost per substitution grows with the square of the genome length: on the order of 10^10 steps for one substitution of a ~197 kb mpox genome. In Nextclade Web, this blocks the analysis of the dataset.

No dataset in `nextclade_data` uses such motifs.

## Code

- `fn PreparedMotif::sites_at()` searches from `max_len` before the substitution, or from 0 when `max_len` is `None` (`packages/nextclade/src/analyze/mutation_patterns.rs`)
- `max_len` is `Properties::maximum_len()` of the motif `Hir`

## Fix options

- **Reject unbounded motifs**: fail the dataset load when `maximum_len()` is `None`, with an error that asks for a bounded repetition such as `{0,20}`. Removes both problems. Motifs of fixed or bounded length cover the known editing signatures
- **Document and accept**: describe the greedy behavior and the cost in the dataset author documentation, and keep unbounded motifs
