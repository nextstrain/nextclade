# Classify and enrich WASM trap errors

## Motivation

All WASM traps (OOM, panics, arithmetic errors, etc.) surface as `RuntimeError: unreachable` with no diagnostic context. Users see a cryptic error popup with message "unreachable" and a "Restart Nextclade" button. No guidance on cause or remediation.

The primary trigger is OOM when analyzing large-genome pathogens (mpox, ~197 kb) in the browser. Each of the 3 web workers loads a full dataset copy + alignment matrices into separate WASM instances, exceeding the 4 GB WASM address space. The CLI handles the same workload (4 GB RSS, single-threaded).

## Background: why the current panic hook is broken

The panic hook at `packages/nextclade-web/src/wasm/jserr.rs:44` uses `wasm_bindgen::throw_val()` to throw a JS `Error` with name `ErrorInternalWasm`. This was intended to convert Rust panics into readable JS errors.

With `panic = "abort"` (configured in `.cargo/config.toml:62`), the sequence is:

1. Panic hook runs, calls `throw_val()` which calls JS import `__wbindgen_rethrow` (does `throw arg0`)
2. The JS throw exits the imported function
3. WASM abort instruction fires, producing `RuntimeError: unreachable`
4. The `RuntimeError` is what propagates to the JS caller, masking the thrown error from step 1

The custom error from `throw_val()` is lost. The panic hook has never produced its intended `ErrorInternalWasm` errors in production.

OOM does not reach the panic hook at all: `std::alloc::handle_alloc_error` -> `abort()` directly, bypassing the panic mechanism entirely.

## Research findings

### Trap type signatures

Tested with a standalone WASM module (Rust, `wasm-bindgen 0.2.106`, `panic = "abort"`, release build with LTO) across Node v24.15 and Chrome 146.

To reproduce: create a standalone Rust `cdylib` crate with `wasm-bindgen` (outside the nextclade workspace to avoid Cargo.lock conflicts). Export functions that trigger each trap type: `core::arch::wasm32::unreachable()`, `panic!()`, `Vec` allocation loop for OOM, integer division by `std::hint::black_box(0u32)`, unsafe pointer read past allocation (`ptr.add(1_000_000_000)`), infinite recursion. Build with `cargo build --release --target wasm32-unknown-unknown`, generate bindings with `wasm-bindgen --target nodejs` and `--target web`. Run in Node and serve via HTTP for Chrome.

Each trap type produces a distinct `error.stack` call chain. The Rust standard library function names in the stack are demangled and include crate hashes, but the base names (`rust_oom`, `rust_panic`, etc.) are stable identifiers from the Rust runtime.

Results (identical across Chrome 146 and Node v24.15):

| Trap                 | JS error type  | `error.message`                    | Stack fingerprint                                                            |
| -------------------- | -------------- | ---------------------------------- | ---------------------------------------------------------------------------- |
| OOM                  | `RuntimeError` | `unreachable`                      | Contains `rust_oom`, `__rust_alloc_error_handler`, `handle_alloc_error`      |
| Panic                | `RuntimeError` | `unreachable`                      | Contains `rust_panic`, `panic_fmt`, `rust_begin_unwind`                      |
| Divide by zero       | `RuntimeError` | `unreachable`                      | Contains `panic_const_div_by_zero` + panic frames (it is a panic internally) |
| Explicit unreachable | `RuntimeError` | `unreachable`                      | Only the triggering function name, no Rust runtime frames                    |
| OOB memory access    | `RuntimeError` | `memory access out of bounds`      | N/A (distinct message)                                                       |
| Stack overflow       | `RangeError`   | `Maximum call stack size exceeded` | Repeated recursive function frames                                           |

Key finding: `error.message` is NOT useful for classification. OOM, panic, div-by-zero, and explicit unreachable all produce `"unreachable"`. Classification must use `error.stack` content or `error` type.

Example OOM stack (Chrome 146):

```
RuntimeError: unreachable
    at wasm_trap_test.wasm.std[...]::alloc::rust_oom (wasm://wasm/...:wasm-function[31]:0x2924)
    at wasm_trap_test.wasm.__rustc[...]::__rust_alloc_error_handler (wasm://wasm/...:wasm-function[28]:0x2900)
    at wasm_trap_test.wasm.alloc[...]::alloc::handle_alloc_error (wasm://wasm/...:wasm-function[27]:0x28f6)
    at wasm_trap_test.wasm.alloc[...]::raw_vec::handle_error (wasm://wasm/...:wasm-function[22]:0x28a5)
    at wasm_trap_test.wasm.trigger_oom (wasm://wasm/...:wasm-function[10]:0x256f)
```

Example panic stack (Chrome 146):

```
RuntimeError: unreachable
    at wasm_trap_test.wasm.__rustc[...]::rust_panic (wasm://wasm/...:wasm-function[36]:0x2947)
    at wasm_trap_test.wasm.std[...]::panicking::panic_with_hook (wasm://wasm/...:wasm-function[13]:0x26c8)
    at wasm_trap_test.wasm.core[...]::panicking::panic_fmt (wasm://wasm/...:wasm-function[16]:0x27ba)
    at wasm_trap_test.wasm.trigger_panic (wasm://wasm/...:wasm-function[24]:0x28cd)
```

### Stash-based panic message recovery

The `throw_val()` approach fails (see "why the current panic hook is broken" above). An alternative was tested: the panic hook calls a JS import function that stores the message in a JS variable (the "stash"), instead of throwing.

```rust
// In panic hook:
stash_panic_message(&msg);  // JS import, stores msg in worker-scoped variable
// Then abort fires, JS catches RuntimeError, reads stashed message
```

Verified working: the JS import function completes and stores the message before the WASM abort instruction fires. After catching `RuntimeError`, the stashed message is available in the JS catch handler. The stash variable must live in the same worker scope as the WASM instance (it cannot cross postMessage boundaries).

Combined results with stash hook + stack fingerprinting:

| Trap                 | Detection method            | Stash content                                                        | User-facing message               |
| -------------------- | --------------------------- | -------------------------------------------------------------------- | --------------------------------- |
| OOM                  | `rust_oom` in stack         | (none)                                                               | "Ran out of memory" + advice      |
| `panic!("msg")`      | Stash present               | `"msg"` + `src/file.rs:line:col`                                     | Verbatim panic message + location |
| `unwrap()` on None   | Stash present               | `"called Option::unwrap() on a None value"` + location               | Verbatim panic message + location |
| Index out of bounds  | Stash present               | `"index out of bounds: the len is 3 but the index is 10"` + location | Verbatim panic message + location |
| Divide by zero       | Stash present               | `"attempt to divide by zero"` + location                             | Verbatim panic message + location |
| Explicit unreachable | Neither signature, no stash | (none)                                                               | Generic internal error            |
| Stack overflow       | `RangeError` type           | (none)                                                               | Generic internal error            |

### Why not other approaches

- `set_alloc_error_hook` (nightly Rust): converts OOM to panic. Would work, but nightly-only. Tracking issue [rust-lang/rust#51245](https://github.com/rust-lang/rust/issues/51245). `-Z oom=panic` was [removed](https://github.com/rust-lang/rust/pull/147725).
- Custom `GlobalAlloc` wrapper: stable, but panicking inside `alloc()` is UB per [Rust docs](https://doc.rust-lang.org/std/alloc/trait.GlobalAlloc.html). Can log or set flags, but cannot convert OOM to a catchable error.
- `WebAssembly.Memory.buffer.byteLength` threshold: checking if memory is near 4 GB after catching the error. Arbitrary threshold, unreliable. Stack fingerprinting is deterministic.
- `error.message` matching: all four trap types produce `"unreachable"`. Useless for classification.

### Fundamental limitation: Rust WASM OOM is an unsolved problem

This is a known gap in the Rust WASM ecosystem. When `std::alloc::handle_alloc_error` fires, it calls `abort()` which compiles to the WASM `unreachable` instruction. There is no stable Rust mechanism to convert OOM into a catchable error. The nightly `set_alloc_error_hook` API ([rust-lang/rust#51245](https://github.com/rust-lang/rust/issues/51245)) is the intended solution, but stabilization is blocked on reentrancy concerns. The `-Z oom=panic` compiler flag was [removed](https://github.com/rust-lang/rust/pull/147725) in 2025.

The stack fingerprinting approach in this ticket works around the limitation by detecting OOM after the fact from the JS side, without requiring any unstable Rust features. The trade-off: the WASM instance is corrupted after the trap and must be destroyed. This ticket does not add recovery (restarting with fewer workers), only better error reporting.

### Same problem in other Rust WASM projects

- [rerun-io/rerun#7591](https://github.com/rerun-io/rerun/issues/7591): same stack trace pattern (`__rg_oom` -> `handle_alloc_error` -> `unreachable`), large file triggers OOM, open and unresolved
- [Badel2/slime_seed_finder#34](https://github.com/Badel2/slime_seed_finder/issues/34): solved with nightly `set_alloc_error_hook`, confirmed the hook converts OOM into a catchable panic with message
- [cloudflare/workers-rs#826](https://github.com/cloudflare/workers-rs/issues/826): proposes extending panic recovery to all WASM critical errors including OOM, open

## Design

### Classification logic

```typescript
function classifyWasmError(error: unknown, panicMessage: string | undefined): Error {
  // Panic with recovered message (highest priority - most specific)
  if (panicMessage) {
    return new ErrorWasmPanic(panicMessage, error);
  }

  // Stack overflow (distinct error type)
  if (error instanceof RangeError) {
    return new ErrorWasmInternal("stack overflow", error);
  }

  if (error instanceof WebAssembly.RuntimeError) {
    const stack = error.stack ?? "";

    // OOM (stack contains Rust allocator frames)
    if (stack.includes("rust_oom") || stack.includes("handle_alloc_error")) {
      return new ErrorWasmOutOfMemory(error);
    }

    // Panic without stash (stack contains Rust panic frames, but message was lost)
    if (stack.includes("rust_panic") || stack.includes("panic_fmt")) {
      return new ErrorWasmPanic(undefined, error);
    }

    // OOB memory access (distinct message)
    if (error.message.includes("memory access out of bounds")) {
      return new ErrorWasmInternal("memory access out of bounds", error);
    }
  }

  // Unknown trap (fallback - covers Firefox where stack symbols may be mangled)
  return new ErrorWasmUnknown(error);
}
```

### Stash mechanism

The stash variable lives in worker scope, co-located with the WASM instance. It must be reset before each WASM call and read after catching an error.

```typescript
// In nextcladeWasm.worker.ts, at module level:
let lastPanicMessage: string | undefined;
globalThis.__wasm_stash_panic = (msg: string) => {
  lastPanicMessage = msg;
};

// Wrapper for all WASM calls:
function callWasm<T>(fn: () => T): T {
  lastPanicMessage = undefined;
  try {
    return fn();
  } catch (error: unknown) {
    const classified = classifyWasmError(error, lastPanicMessage);
    lastPanicMessage = undefined;
    throw classified;
  }
}
```

### Error messages

- `ErrorWasmOutOfMemory`: "Analysis ran out of memory. Try reducing the number of CPU threads in Settings (try 1), reducing the number of input sequences, or using Nextclade CLI which does not have browser memory limits."
- `ErrorWasmPanic` (with message): the verbatim Rust panic message + source location, formatted as "Internal Error: {message}. Location: {location}. This is an internal issue. Please report it to developers."
- `ErrorWasmPanic` (no message): "Internal error in the analysis engine. Please report it to developers."
- `ErrorWasmInternal`: "Internal WebAssembly error ({detail}). Please report it to developers."
- No fingerprint match (fallback, covers Firefox where stack symbols may be mangled): "Internal WebAssembly error, possibly caused by running out of memory. If analyzing large genomes, try reducing the number of CPU threads in Settings or using Nextclade CLI."

Firefox may mangle Rust symbols in WASM stack traces (Mozilla bug 1519569, also noted in `jserr.rs:63`). If `rust_oom` and `rust_panic` are absent from the stack, the fallback message applies. The fallback mentions memory as a possible cause so the advice to reduce threads is contextually motivated.

### Error class serialization across worker boundaries

The vendored `threads` library (`packages/nextclade-web/vendor/threads/src/serializers.ts:49-63`) serializes errors to `{ __error_marker, message, name, stack }` and deserializes to a plain `Error`. Custom error classes are lost: `instanceof ErrorWasmOutOfMemory` fails after deserialization. Verified with a direct test of the serializer logic.

`error.name` IS preserved. Each error class sets `this.name` in its constructor (e.g. `this.name = "ErrorWasmOutOfMemory"`). The rendering code in `ErrorContent.tsx` checks `error.name` string equality instead of `instanceof`.

### `callWasm` exclusion: `free()`

The `destroy()` function at `nextcladeWasm.worker.ts:65-77` calls `nextcladeWasm.free()` inside its own silent try/catch, which is correct for cleanup of a corrupted WASM instance after a prior trap. `callWasm` must NOT wrap `free()`: it would reset `lastPanicMessage` and lose the stash from the original failing call. The existing silent catch on `free()` is preserved as-is.

### Rust-side panic hook change

Current (`jserr.rs:44-74`):

```rust
fn panic_hook(info: &PanicHookInfo<'_>) {
  // ... format message ...
  error(console_message);                    // console.error (keep)
  let js_error = Error::new_with_message(&user_message);
  js_error.set_name("ErrorInternalWasm");
  wasm_bindgen::throw_val(js_error.into());  // BROKEN: masked by abort
}
```

New:

```rust
fn panic_hook(info: &PanicHookInfo<'_>) {
  // ... format message ...
  error(console_message);           // console.error (keep)
  stash_panic_message(&user_message); // store in JS variable (new)
}

#[wasm_bindgen]
extern "C" {
  #[wasm_bindgen(js_namespace = globalThis, js_name = __wasm_stash_panic)]
  fn stash_panic_message(msg: &str);
}
```

## Error propagation path (current)

```
WASM trap (OOM / panic / other)
  -> RuntimeError("unreachable")
  -> wasm-bindgen JS wrapper (nextclade-wasm_bg.js, no try/catch, just try/finally for stack pointer)
  -> nextcladeWasm.worker.ts:97 (analyze function, no try/catch)
  -> threads.js serializes error across postMessage to launcher worker
  -> launcher.worker.ts:109 (.catch on onSequenceImpl promise)
  -> launcher.worker.ts:130 (onError: sets status=failed, errors the observable, destroys workers)
  -> launchAnalysis.ts:61 (onError callback from observable subscription)
  -> useRunAnalysis.ts:162 (onError callback sets globalErrorAtom)
  -> ErrorPopup.tsx:24 (renders error.message in modal)
```

The enrichment happens at `nextcladeWasm.worker.ts` by wrapping the WASM call with `callWasm()`. The enriched error then flows through the existing path unchanged, but now carries an actionable message instead of "unreachable".

## Changes

### Rust

`packages/nextclade-web/src/wasm/jserr.rs`:

- Replace `throw_val()` with `stash_panic_message()` JS import
- Add `extern "C"` binding for `__wasm_stash_panic`
- Remove `Error::new_with_message`, `set_name("ErrorInternalWasm")`, `throw_val` calls
- Keep `console.error()` logging with stack trace

### TypeScript (new file)

`packages/nextclade-web/src/helpers/ErrorWasm.ts`:

- `ErrorWasmOutOfMemory extends Error` (`name = "ErrorWasmOutOfMemory"`) with OOM advice message
- `ErrorWasmPanic extends Error` (`name = "ErrorWasmPanic"`) storing optional panic message + location
- `ErrorWasmInternal extends Error` (`name = "ErrorWasmInternal"`) for identified traps (stack overflow, OOB memory)
- `ErrorWasmUnknown extends Error` (`name = "ErrorWasmUnknown"`) for unclassified traps (fallback mentioning possible OOM)
- `classifyWasmError(error, panicMessage): Error` implementing the classification table

### TypeScript (modify)

`packages/nextclade-web/src/workers/nextcladeWasm.worker.ts`:

- Add `lastPanicMessage` variable at module scope
- Add `globalThis.__wasm_stash_panic` callback
- Add `callWasm<T>(fn: () => T): T` wrapper
- Wrap all WASM call sites except `free()`: `analyze`, `getInitialData`, `getOutputTrees`, `create`, `parseSequencesStreaming`, `parseRefSequence`, all `serialize_*` functions
- `free()` keeps its existing silent try/catch (cleanup of corrupted instance, must not reset stash)

`packages/nextclade-web/src/components/Error/ErrorContent.tsx`:

- Add branches in `ErrorContentMessage` checking `error.name` (not `instanceof`, since `threads` serialization loses the class):
  - `error.name === "ErrorWasmOutOfMemory"`: render structured OOM advice
  - `error.name === "ErrorWasmPanic"`: render panic message + location + "please report"
  - `error.name === "ErrorWasmInternal"`: render specific internal error + "please report"
  - `error.name === "ErrorWasmUnknown"`: render fallback message mentioning possible OOM + advice

## Verification

1. Build WASM: `./docker/dev W`
2. Reproduce mpox OOM: `http://localhost:3000/?dataset-name=nextstrain/mpox/all-clades&input-fasta=example` - verify OOM-specific message with advice appears instead of "unreachable"
3. SARS-CoV-2 analysis: `http://localhost:3000/?dataset-name=sars-cov-2&input-fasta=example` - verify normal operation unaffected
4. Panic recovery: introduce temporary `panic!("test panic message")` in `packages/nextclade/src/run/nextclade_run_one.rs` at start of `nextclade_run_one()`, rebuild WASM, run SARS-CoV-2 analysis, verify the error popup shows "test panic message" with source location

## Related

- `kb/issues/H-wasm-oom-large-genomes.md` - large genome OOM root cause (prevention via thread count requires `pathogen.json` changes, separate feature)
- `kb/proposals/feat-dataset-resource-hints.md` - dataset-driven thread count limits
