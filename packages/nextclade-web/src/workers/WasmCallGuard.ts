import { classifyWasmError, WasmAllocFailure } from 'src/helpers/ErrorWasm'

declare global {
  /** Last failed allocation, written by the WebAssembly allocator in `src/wasm/alloc_report.rs` */
  // eslint-disable-next-line no-var, vars-on-top, no-underscore-dangle -- `declare global` requires `var`, and the name is shared with the allocator
  var __nextcladeAllocFailure: WasmAllocFailure | undefined
}

/**
 * Guard for the calls into one WebAssembly instance.
 *
 * After a fatal error (out-of-memory abort, panic, other trap) the state of the instance is undefined. The guard
 * then throws the classified error (see `classifyWasmError()`) and refuses every later call with the same error,
 * so that no code runs on the broken instance. The error name tells the caller that the instance is broken
 * (`isFatalWasmErrorName()`). Non-fatal errors pass through unchanged.
 *
 * Each worker that loads the WebAssembly module creates one guard and wraps only the calls into the module, because
 * an error in JS code around the call (such as `JSON.parse`) says nothing about the state of the instance.
 */
export class WasmCallGuard {
  private fatalError: Error | undefined = undefined

  public call<T>(fn: () => T): T {
    if (this.fatalError) {
      throw this.fatalError
    }

    // eslint-disable-next-line no-underscore-dangle -- the name is shared with the allocator
    globalThis.__nextcladeAllocFailure = undefined
    try {
      return fn()
    } catch (error: unknown) {
      // eslint-disable-next-line no-underscore-dangle -- the name is shared with the allocator
      const fatalError = classifyWasmError(error, globalThis.__nextcladeAllocFailure)
      if (!fatalError) {
        throw error
      }
      this.fatalError = fatalError
      throw fatalError
    }
  }
}
