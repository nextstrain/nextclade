# Dataset resource hints in pathogen.json

## Motivation

Large-genome datasets (mpox ~197 kb) cause WASM OOM in the browser because multiple workers each allocate large alignment matrices. The software cannot hardcode per-pathogen resource requirements - dataset maintainers must be able to specify them per dataset.

## Proposal

Add optional resource hint fields to `pathogen.json` that Nextclade Web reads at analysis launch to adjust worker count and warn users.

### Fields

```json
{
  "resourceHints": {
    "maxWebWorkers": 1,
    "estimatedMemoryPerSequenceMb": 2000,
    "webWarning": "This dataset has a large genome. For best results, use 1 CPU thread or Nextclade CLI."
  }
}
```

- `maxWebWorkers`: cap on web worker count, overriding user setting. Absent = no cap.
- `estimatedMemoryPerSequenceMb`: expected peak memory per sequence analysis. Absent = no estimate. Nextclade Web uses this to compute a safe worker count from available memory.
- `webWarning`: optional warning shown before analysis starts. Absent = no warning.

All fields optional. Absent `resourceHints` = current behavior.

### Behavior

1. At analysis launch, after dataset is loaded but before workers spawn
2. Read `resourceHints` from the dataset's `pathogen.json`
3. If `maxWebWorkers` present: `effectiveThreads = min(userSetting, maxWebWorkers)`
4. If `estimatedMemoryPerSequenceMb` present: `effectiveThreads = min(effectiveThreads, availableMemory / estimate)`
5. If effective thread count differs from user setting: show toast notification
6. If `webWarning` present: show warning banner

### Scope

- Nextclade Web: read hints, adjust workers, show warnings
- Nextclade CLI: ignore hints (CLI has no WASM memory limit)
- `nextclade_data`: dataset maintainers add hints to affected datasets (mpox, other large-genome pathogens)
- Schema: update `pathogen.json` schema in `nextclade-schemas`

### Dependencies

- Requires `pathogen.json` schema change in `packages/nextclade/src/analyze/virus_properties.rs`
- Requires coordination with `nextclade_data` repo for adding hints to affected datasets
- Requires web app changes in `getNumThreads.ts` and `launchAnalysis.ts`

## Related

- Known issue: `kb/issues/H-wasm-oom-large-genomes.md`
