import { WasmCallGuard } from 'src/workers/WasmCallGuard'

describe('WasmCallGuard', () => {
  afterEach(() => {
    globalThis.__nextcladeAllocFailure = undefined
  })

  it('returns the result of a successful call', () => {
    const guard = new WasmCallGuard()

    expect(guard.call(() => 42)).toBe(42)
  })

  it('throws a classified error after a fatal error and refuses later calls with the same error', () => {
    const guard = new WasmCallGuard()

    const fatalError = catchError(() =>
      guard.call(() => {
        globalThis.__nextcladeAllocFailure = { size: 3 * 1024 ** 2, align: 8 }
        throw new WebAssembly.RuntimeError('unreachable')
      }),
    )
    const nextCall = vi.fn(() => 42)
    const refusal = catchError(() => guard.call(nextCall))

    expect(fatalError.name).toBe('ErrorWasmOutOfMemory')
    expect(fatalError.message).toContain('3 MiB')
    expect(refusal).toBe(fatalError)
    expect(nextCall).not.toHaveBeenCalled()
  })

  it('rethrows a non-fatal error unchanged and stays usable', () => {
    const guard = new WasmCallGuard()
    const error = new Error('Sequence is too short')

    const thrown = catchError(() =>
      guard.call(() => {
        throw error
      }),
    )

    expect(thrown).toBe(error)
    expect(guard.call(() => 42)).toBe(42)
  })

  it('ignores an allocation failure reported before the call', () => {
    const guard = new WasmCallGuard()
    globalThis.__nextcladeAllocFailure = { size: 1024, align: 8 }

    const thrown = catchError(() =>
      guard.call(() => {
        throw new WebAssembly.RuntimeError('unreachable')
      }),
    )

    expect(thrown.name).toBe('ErrorWasmUnknown')
  })
})

function catchError(fn: () => unknown): Error {
  try {
    fn()
  } catch (error: unknown) {
    if (error instanceof Error) {
      return error
    }
    throw new Error(`Expected an Error, got: ${String(error)}`)
  }
  throw new Error('Expected the function to throw')
}
