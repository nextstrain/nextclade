# Classify and enrich WASM trap errors

## Motivation

WASM traps (OOM, panics after the first one, arithmetic errors, etc.) surface as `RuntimeError: unreachable` with no diagnostic context. Users see a cryptic error popup with message "unreachable" and a "Restart Nextclade" button. No guidance on cause or remediation.

The known trigger of OOM is a single large alignment: a sequence whose alignment band needs more memory than the 4 GiB WASM address space of one worker. Each web worker has its own WASM memory, so the number of workers does not change this limit. Matrix allocation of the nucleotide alignment is fallible and gives a per-sequence error, but other allocations still abort.

## Background: the panic hook

The panic hook at `packages/nextclade-web/src/wasm/jserr.rs` uses `wasm_bindgen::throw_val()` to throw a JS `Error` with name `ErrorInternalWasm`. With `panic = "abort"` ([.cargo/config.toml#L62](../../.cargo/config.toml#L62)), the hook runs before the abort instruction. Since 3.19.0 the hook works for the first panic of an instance: the JS throw leaves the WASM frames before the abort can run, so the `ErrorInternalWasm` error reaches the JS caller. A probe build with the same hook confirmed this.

Limits:

- A second panic in the same instance skips the hook and traps with `RuntimeError: unreachable`
- OOM does not reach the panic hook at all: `std::alloc::handle_alloc_error` -> `abort()` directly, bypassing the panic mechanism entirely

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

Stack fingerprints work only in builds with function names. Release builds strip them (`strip = true`, [.cargo/config.toml#L63](../../.cargo/config.toml#L63)), and the error report of a 3.25.0 production crash shows only frames such as `wasm-function[6006]`. Matching `rust_oom` or `rust_panic` in `error.stack` therefore works only in dev builds. Production classification needs another signal, for example a name section kept for the Rust runtime functions, or a flag that a custom allocator sets before it aborts.

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

The `throw_val()` approach works only for the first panic of an instance (see "Background: the panic hook" above). An alternative was tested: the panic hook calls a JS import function that stores the message in a JS variable (the "stash"), instead of throwing.

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

The stack fingerprinting approach in this ticket works around the limitation by detecting OOM after the fact from the JS side, without requiring any unstable Rust features. The trade-off: the WASM instance is corrupted after the trap and must be destroyed. This ticket does not add recovery (worker replacement), only better error reporting.

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

- `ErrorWasmOutOfMemory`: "Analysis ran out of memory while allocating {size}. Nextclade CLI does not have the 4 GiB memory limit of the browser." The size comes from the signal that detects the OOM, for example the allocation size that a custom allocator records before it aborts. Without a known size, the message omits it
- `ErrorWasmPanic` (with message): the verbatim Rust panic message + source location, formatted as "Internal Error: {message}. Location: {location}. This is an internal issue. Please report it to developers."
- `ErrorWasmPanic` (no message): "Internal error in the analysis engine. Please report it to developers."
- `ErrorWasmInternal`: "Internal WebAssembly error ({detail}). Please report it to developers."
- No fingerprint match (fallback, covers Firefox where stack symbols may be mangled): "Internal WebAssembly error, possibly caused by running out of memory. If analyzing large genomes, try Nextclade CLI."

Firefox may mangle Rust symbols in WASM stack traces (Mozilla bug 1519569, also noted in `jserr.rs:63`). If `rust_oom` and `rust_panic` are absent from the stack, the fallback message applies. The fallback mentions memory as a possible cause so the advice to use Nextclade CLI is contextually motivated.

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
  wasm_bindgen::throw_val(js_error.into());  // first panic of an instance only
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
2. OOM: in a debug build, add temporary large allocations that stay alive together at the start of `nextclade_run_one()` in `packages/nextclade/src/run/nextclade_run_one.rs`, for example `let _big = [vec![1_u8; 1_500_000_000], vec![1_u8; 1_500_000_000], vec![1_u8; 1_500_000_000]];`. The third allocation exceeds the 4 GiB WASM memory. Keep each allocation below 2 GiB, because on wasm32 a larger `Vec` fails with a capacity-overflow panic instead of an out-of-memory abort. Rebuild WASM, run `http://localhost:3000/?dataset-name=sars-cov-2&input-fasta=example`, and verify that the OOM-specific message with advice appears instead of "unreachable"
3. SARS-CoV-2 analysis: `http://localhost:3000/?dataset-name=sars-cov-2&input-fasta=example` - verify normal operation unaffected
4. Panic recovery: introduce temporary `panic!("test panic message")` in `packages/nextclade/src/run/nextclade_run_one.rs` at start of `nextclade_run_one()`, rebuild WASM, run SARS-CoV-2 analysis, verify the error popup shows "test panic message" with source location

## Related issues

- [kb/issues/M-web-fatal-wasm-error-stops-run.md](../issues/M-web-fatal-wasm-error-stops-run.md)
