# WASM OOM for large genomes

## Problem

Nextclade Web runs out of memory (WASM 4 GB limit) when analyzing sequences from large-genome pathogens (e.g. mpox, ~197 kb). The alignment score matrix alone can consume ~1.6 GB per worker. With multiple workers, combined memory exceeds the per-instance WASM limit. The crash manifests as `RuntimeError: unreachable` with no actionable message.

SARS-CoV-2 (~30 kb) works fine with 3 workers. Mpox (~197 kb) crashes with default settings.

## Root cause

Each web worker instantiates a separate WASM module that holds: the dataset, alignment score matrices (`max_band_area: 500_000_000` = up to 2 GB for scores at `packages/nextclade/src/align/params.rs:188`), translation buffers, and analysis results. The browser's total WASM memory budget (varies by browser and OS) is shared across all workers. Large genomes push individual workers near the limit; multiple workers exceed it.

## Constraint

Thread count reduction cannot be hardcoded in software per-pathogen. The solution requires coordination with the data repository (`nextclade_data`) and `pathogen.json` configuration, so dataset maintainers can specify resource requirements per dataset.

See `kb/proposals/feat-dataset-resource-hints.md` for the proposed solution.

## Possible directions (not decided)

- A `pathogen.json` field for recommended/maximum worker count or memory budget
- A `pathogen.json` field for expected alignment memory (derived from genome size and alignment params)
- Dynamic thread count at analysis launch, reading the recommendation from dataset metadata
- Adjusting `max_band_area` per dataset in `pathogen.json` (already partially supported via alignment param overrides)

## Mitigation

Better error messages when WASM traps occur (stash-based panic hook, `WebAssembly.RuntimeError` catch and enrichment in workers). This does not prevent the crash but makes the failure actionable: users are advised to reduce CPU threads in Settings or use Nextclade CLI.

## Reproduction

1. Open Nextclade Web with mpox dataset: `http://localhost:3000/?dataset-name=mpox&input-fasta=example`
2. Analysis crashes with `RuntimeError: unreachable` in the browser console
3. CLI works fine: `nextclade run --input-dataset data/mpox data/mpox/sequences.fasta`

## References

- Alignment params: `packages/nextclade/src/align/params.rs:188` (`max_band_area: 500_000_000`)
- Thread count logic: `packages/nextclade-web/src/helpers/getNumThreads.ts`
- Panic hook: `packages/nextclade-web/src/wasm/jserr.rs`
- Worker error handling: `packages/nextclade-web/src/workers/nextcladeWasm.worker.ts`
