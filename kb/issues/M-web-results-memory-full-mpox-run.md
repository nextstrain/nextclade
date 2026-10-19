# Nextclade Web keeps several full copies of the analysis results

## Problem

Nextclade Web keeps the full result of every analyzed sequence in more than one place, and builds the output tree from one large JSON string of all results. For datasets with large results, the memory of the browser tab grows with the number of sequences until the tab crashes.

A run of the dataset `nextstrain/mpox/all-clades` with 323 mpox sequences in the development build measured:

- **Launcher worker**: `AnalysisWorkerPool.results` holds the full `AnalysisResult` of every sequence, about 1 MB of JSON per mpox sequence. The pool keeps them only to build the output tree at the end of the run
- **Main thread**: about 5 MB of JavaScript heap per sequence. The results reach the main thread as full objects through the worker messages, and `useRunAnalysis` copies the array of results into the Jotai atom after every result
- **Tree building**: `getOutputTrees` serializes the full results of each dataset to one JSON string, about 300 MB for this run, and sends it to an analysis worker, which parses it again in WebAssembly memory
- **Outcome**: with 1 thread the run completed, and the renderer process used 11.8 GB. With 3 threads the tab crashed about 2.5 minutes after the analysis of all sequences finished

The development build started every analysis twice at the time of the measurement (two launchers, two worker pools), so the measured numbers include duplicate results. The duplicate start is fixed, and the analysis workers now return the WebAssembly memory of very large alignments to the browser. The result copies remain.

## Code

- Result copy in the launcher worker: [packages/nextclade-web/src/workers/AnalysisWorkerPool.ts#L34](../../packages/nextclade-web/src/workers/AnalysisWorkerPool.ts#L34) and [packages/nextclade-web/src/workers/AnalysisWorkerPool.ts#L92](../../packages/nextclade-web/src/workers/AnalysisWorkerPool.ts#L92)
- Serialization for tree building: [packages/nextclade-web/src/workers/AnalysisWorkerPool.ts#L102](../../packages/nextclade-web/src/workers/AnalysisWorkerPool.ts#L102), called from [packages/nextclade-web/src/workers/launcher.worker.ts#L79](../../packages/nextclade-web/src/workers/launcher.worker.ts#L79)
- Tree building in WebAssembly: `fn NextcladeWasm::get_output_trees()` [packages/nextclade-web/src/wasm/main.rs#L138](../../packages/nextclade-web/src/wasm/main.rs#L138)
- Result copy on the main thread: [packages/nextclade-web/src/hooks/useRunAnalysis.ts#L167](../../packages/nextclade-web/src/hooks/useRunAnalysis.ts#L167)

## Fix

- Do not keep full results in the launcher worker. Keep only the fields that tree building needs, or let the analysis worker keep the data for the tree
- Stream or slim the results that reach the main thread: the results table and the visualizations need a subset of each result, and the export can request the full results when the user exports them
- Build the output tree from slim results, so that tree building does not serialize and parse all results in one string
