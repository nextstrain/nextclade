# Ambiguous query nucleotides count as mutation pattern events

## Problem

Pattern filters match nucleotides by IUPAC overlap in both directions. A filter `"qry": ["G"]` also matches the ambiguous query nucleotides `R`, `S`, `K`, `B`, `D` and `V`. An A>R call is not evidence of an A>G change, but it counts as an ADAR-like event and can form clusters. Mixed or low-quality sites then look like editing signals.

## Code

- `fn PreparedNucSubstitution::match_substitution()` uses `is_nuc_match` ([packages/nextclade/src/analyze/mutation_patterns.rs](../../packages/nextclade/src/analyze/mutation_patterns.rs))
- `fn is_nuc_match()` ([packages/nextclade/src/alphabet/nuc.rs#L98](../../packages/nextclade/src/alphabet/nuc.rs#L98))
- Test case `exact_filter_matches_ambiguous_qry` in `test_mutation_patterns_iupac_filters` pins the current behavior

## Decision needed

- **Exact membership**: match the listed symbols literally; authors list ambiguity codes explicitly when they want them
- **Subset semantics**: accept a nucleotide when its base set is a subset of the filter's base set, so filter `N` still matches everything and filter `G` does not match `R`
