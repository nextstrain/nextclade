/**
 * Fakes at the thread boundary of the `threads` package, for tests of the classes that own worker threads.
 *
 * A fake thread is a plain object with the methods of the worker module. Like a real thread it answers
 * `Thread.terminate()` (a call of the method under the symbol `thread.terminate`), and calls sent after termination
 * never settle, as calls to a terminated thread of `threads` do.
 */

/** Stand-in for the browser `Worker` constructor */
export class FakeNativeWorker {
  public static instances: FakeNativeWorker[] = []

  public readonly terminate = vi.fn(async () => 0)

  constructor() {
    FakeNativeWorker.instances.push(this)
  }
}

/** State of a fake thread that tests inspect */
export interface FakeThreadState {
  isTerminated: boolean
  /** Number of calls sent to the thread after it was terminated. Each of them never settles */
  numCallsAfterTermination: number
  /** Order in which the thread received calls, by method name */
  calls: string[]
}

/**
 * Create a thread whose methods run the given implementations, and its observable state.
 *
 * The returned thread terminates like a real one, and calls after termination never settle.
 */
export function createFakeThread<Methods extends Record<string, (...args: never[]) => Promise<unknown>>>(
  methods: Methods,
): { thread: Methods; state: FakeThreadState } {
  const state: FakeThreadState = { isTerminated: false, numCallsAfterTermination: 0, calls: [] }

  const terminate = vi.fn(async () => {
    state.calls.push('terminate')
    state.isTerminated = true
  })

  const thread = new Proxy(methods, {
    get(target, key, receiver) {
      if (typeof key === 'symbol' && key.description === 'thread.terminate') {
        return terminate
      }
      const method: unknown = Reflect.get(target, key, receiver)
      if (typeof key !== 'string' || typeof method !== 'function') {
        return method
      }
      return async (...args: unknown[]) => {
        state.calls.push(key)
        if (state.isTerminated) {
          state.numCallsAfterTermination += 1
          return new Promise(() => {})
        }
        return Reflect.apply(method, target, args)
      }
    },
  })

  return { thread, state }
}

/** Error as it arrives from a worker after a fatal WebAssembly error: a plain `Error` with a fatal name */
export function fatalError(message: string): Error {
  const error = new Error(message)
  error.name = 'ErrorInternalWasm'
  return error
}
