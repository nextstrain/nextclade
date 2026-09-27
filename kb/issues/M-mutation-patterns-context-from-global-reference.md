# Mutation pattern context comes from the reference, the substituted base from the nearest node

## Problem

A private substitution has the nearest tree node's nucleotide as `refNuc`. The reported `refContext` and all motif sites come from the global reference sequence. When the node differs from the reference at the substituted position (for example a reversion) or next to it, the context does not describe the sequence in which the substitution happened. The center of `refContext` then differs from `refNuc`.

Example: the reference has A at position 3, the node has G, and the query reverted to A. The output has `refNuc: "G"` and `refContext: ["T", "A", "T"]`, and motifs are matched against `TAT`, not `TGT`.

The effect grows with the distance between the node and the reference, which matters for divergent datasets.

## Code

- `fn NucSubWithContext::from_sub()` ([packages/nextclade/src/analyze/nuc_sub_context.rs#L22-L35](../../packages/nextclade/src/analyze/nuc_sub_context.rs#L22-L35))
- Motif sites are precomputed on the reference sequence in `struct MotifSites` ([packages/nextclade/src/analyze/mutation_patterns.rs](../../packages/nextclade/src/analyze/mutation_patterns.rs))
- `refNuc` of private substitutions is the node state (`fn find_private_nuc_mutations()` in [packages/nextclade/src/analyze/find_private_nuc_mutations.rs](../../packages/nextclade/src/analyze/find_private_nuc_mutations.rs))

## Decision needed

This is a scientific choice. Options:

- **Node context**: build the context and motif window from the nearest node's sequence (reference plus node mutations)
- **Reference context, consistent base**: filter by the reference nucleotide at the position instead of `refNuc`, and document the approximation
