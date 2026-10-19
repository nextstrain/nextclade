import prettyBytes from 'pretty-bytes'

/** Out-of-memory abort of the WebAssembly instance, with the size of the failed allocation */
export const ERROR_WASM_OUT_OF_MEMORY = 'ErrorWasmOutOfMemory'

/** Rust panic, thrown by the panic hook in `src/wasm/jserr.rs` with the panic text and location */
export const ERROR_INTERNAL_WASM = 'ErrorInternalWasm'

/** Any other WebAssembly trap, including a stack overflow inside the WebAssembly code */
export const ERROR_WASM_UNKNOWN = 'ErrorWasmUnknown'

/**
 * Names of errors after which the WebAssembly instance is in an undefined state and must not be called again.
 *
 * Errors lose their class when they cross the worker boundary (only `name`, `message` and `stack` survive), so
 * receivers recognize these errors by name.
 */
export const FATAL_WASM_ERROR_NAMES: ReadonlySet<string> = new Set<FatalWasmErrorName>([
  ERROR_WASM_OUT_OF_MEMORY,
  ERROR_INTERNAL_WASM,
  ERROR_WASM_UNKNOWN,
])

/** Return `true` if an error with this name means that the WebAssembly instance is broken */
export function isFatalWasmErrorName(name: string): name is FatalWasmErrorName {
  return FATAL_WASM_ERROR_NAMES.has(name)
}

/**
 * Classify an error thrown by a call into the WebAssembly module.
 *
 * Return a new error with a fatal name and a readable message if the error means that the WebAssembly instance is
 * broken (out-of-memory abort, panic, other trap), and `undefined` otherwise. The new error keeps the stack of the
 * original error. `allocFailure` is the failed allocation that the allocator reported during the call, if any.
 */
export function classifyWasmError(error: unknown, allocFailure: WasmAllocFailure | undefined): Error | undefined {
  if (!(error instanceof Error)) {
    return undefined
  }

  if (isFatalWasmErrorName(error.name)) {
    return createError(error.name, error.message, error)
  }

  if (isWasmTrap(error)) {
    if (allocFailure) {
      const size = prettyBytes(allocFailure.size, { binary: true })
      return createError(
        ERROR_WASM_OUT_OF_MEMORY,
        `Nextclade Web ran out of browser memory while allocating ${size}. Nextclade CLI has no browser memory limit.`,
        error,
      )
    }

    return createError(
      ERROR_WASM_UNKNOWN,
      `Internal error in the analysis engine (WebAssembly trap: "${error.name}: ${error.message}"). This is an internal issue, likely due to a programming mistake. Please report it to developers!`,
      error,
    )
  }

  return undefined
}

export type FatalWasmErrorName =
  | typeof ERROR_WASM_OUT_OF_MEMORY
  | typeof ERROR_INTERNAL_WASM
  | typeof ERROR_WASM_UNKNOWN

/** Size and alignment of the allocation request that failed, in bytes, as reported by the WebAssembly allocator */
export interface WasmAllocFailure {
  size: number
  align: number
}

/** Return `true` for a WebAssembly trap, and for a stack overflow, which a too deep recursion in WebAssembly causes */
function isWasmTrap(error: Error): boolean {
  if (error instanceof WebAssembly.RuntimeError) {
    return true
  }
  return error instanceof RangeError && error.message === 'Maximum call stack size exceeded'
}

function createError(name: string, message: string, original: Error): Error {
  const error = new Error(message)
  error.name = name
  error.stack = original.stack
  return error
}
