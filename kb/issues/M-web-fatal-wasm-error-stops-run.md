# Fatal WebAssembly error stops the whole analysis in Nextclade Web

## Problem

A fatal error inside the WebAssembly module (out-of-memory abort, panic, other trap) of one analysis worker fails the whole analysis run in Nextclade Web:

- The error popup shows `RuntimeError: unreachable` for an out-of-memory abort or another trap, and the raw panic text for a panic. Neither message says what went wrong or what the user can do
- The run stops with status "failed", and the remaining sequences are not analyzed
- The export worker is left unusable, so exports fail until the page reloads

Per-sequence errors, for example a sequence whose alignment band exceeds `maxBandArea` or whose alignment matrix cannot be allocated, are not fatal: they arrive as an error row of that sequence.

## Code

- Panic hook: `packages/nextclade-web/src/wasm/jserr.rs`
- Analysis worker: `packages/nextclade-web/src/workers/nextcladeWasm.worker.ts`
- Error handling of the run: `packages/nextclade-web/src/workers/launcher.worker.ts`

## Fix

Classify fatal WebAssembly errors and show a message with advice ([kb/tickets/feat-wasm-error-classification.md](../tickets/feat-wasm-error-classification.md)). Replace a worker whose WebAssembly instance trapped, and report the failed sequence as an error row so that the run continues.
