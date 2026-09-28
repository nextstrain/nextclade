# Lower-case letters in some `pathogen.json` fields give wrong results without an error

## Problem

Nextclade converts input sequences to upper case when it reads them ([packages/nextclade/src/io/fasta.rs#L133](../../packages/nextclade/src/io/fasta.rs#L133)). Several `pathogen.json` fields that are compared with sequence letters are used as written. With lower-case letters, they match nothing or match the wrong mutations, and Nextclade reports no error:

- **`aaMotifs[].motifs`**: the regex is used as written, so `n[^p][st]` finds no motif in upper-case peptides
- **`phenotypeData[].data[].locations` amino acid keys**: `fn PhenotypeCoeff::get_coeff()` ([packages/nextclade/src/analyze/virus_properties.rs#L452](../../packages/nextclade/src/analyze/virus_properties.rs#L452)) looks up the upper-case amino acid, so a `"k"` key is never found. The `default` coefficient or 0 is used instead, which changes the phenotype score
- **`mutLabels.aaMutLabelMap` keys**: `impl FromStr for AaGenotype` ([packages/nextclade/src/analyze/aa_sub.rs#L66](../../packages/nextclade/src/analyze/aa_sub.rs#L66)) uses an unanchored regex with an optional upper-case query letter, so `S:484k` parses as `S:484` without a query letter. `fn AaGenotype::matches()` ([packages/nextclade/src/analyze/aa_sub.rs#L33](../../packages/nextclade/src/analyze/aa_sub.rs#L33)) then labels every substitution at S:484

PCR primers and `mutLabels.nucMutLabelMap` keys are parsed with `fn to_nuc()`, which rejects lower-case letters, so they fail the dataset load with an error.

Mutation pattern motifs are converted to upper case at dataset load.

No `pathogen.json` in `nextclade_data` has lower-case letters in these fields (checked on all 110 files), so no shipped dataset is affected.

## Fix options

- Convert these fields to upper case at dataset load, like mutation pattern motifs
- Decide whether PCR primers and `nucMutLabelMap` keys get the same conversion, or keep the load error
