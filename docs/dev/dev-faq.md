# Developer FAQs

## How to add new top level output fields to ndjson output?

1. Add new output field to [nextclade::src::types::output::NextcladeOutputs](https://github.com/nextstrain/nextclade/blob/50cea7c56ef25842253055b1210d60babb3fc4ab/packages_rs/nextclade/src/types/outputs.rs#L51)
2. Add that field to the return struct of [nextclade_run_one](https://github.com/nextstrain/nextclade/blob/50cea7c56ef25842253055b1210d60babb3fc4ab/packages_rs/nextclade/src/run/nextclade_run_one.rs#L61)
