import { classifyWasmError, isFatalWasmErrorName } from 'src/helpers/ErrorWasm'

describe('classifyWasmError', () => {
  it('names an out-of-memory abort and the requested size when the allocator reported a failure', () => {
    const error = new WebAssembly.RuntimeError('unreachable')

    const classified = classifyWasmError(error, { size: 1.5 * 1024 ** 3, align: 1 })

    expect(classified?.name).toBe('ErrorWasmOutOfMemory')
    expect(classified?.message).toBe(
      'Nextclade Web ran out of browser memory while allocating 1.5 GiB. Nextclade CLI has no browser memory limit.',
    )
    expect(classified?.stack).toBe(error.stack)
  })

  it('reports a WebAssembly trap without an allocation failure as an unknown internal error', () => {
    const error = new WebAssembly.RuntimeError('unreachable')

    const classified = classifyWasmError(error, undefined)

    expect(classified?.name).toBe('ErrorWasmUnknown')
    expect(classified?.message).toBe(
      'Internal error in the analysis engine (WebAssembly trap: "RuntimeError: unreachable"). This is an internal issue, likely due to a programming mistake. Please report it to developers!',
    )
    expect(classified?.stack).toBe(error.stack)
  })

  it('keeps the name and the message of a Rust panic', () => {
    const error = new Error('Internal Error: index out of bounds.\n\nLocation: src/foo.rs:1:1')
    error.name = 'ErrorInternalWasm'

    const classified = classifyWasmError(error, undefined)

    expect(classified?.name).toBe('ErrorInternalWasm')
    expect(classified?.message).toBe(error.message)
    expect(classified?.stack).toBe(error.stack)
  })

  it('keeps a panic a panic when an allocation failed during the same call', () => {
    const error = new Error('Internal Error: capacity overflow')
    error.name = 'ErrorInternalWasm'

    expect(classifyWasmError(error, { size: 1024, align: 8 })?.name).toBe('ErrorInternalWasm')
  })

  it('reports a stack overflow as an unknown internal error', () => {
    const error = new RangeError('Maximum call stack size exceeded')

    const classified = classifyWasmError(error, undefined)

    expect(classified?.name).toBe('ErrorWasmUnknown')
    expect(classified?.message).toContain('RangeError: Maximum call stack size exceeded')
    expect(classified?.stack).toBe(error.stack)
  })

  it('returns the same classification for an already classified error', () => {
    const classified = classifyWasmError(new WebAssembly.RuntimeError('unreachable'), { size: 2048, align: 8 })

    const reclassified = classifyWasmError(classified, undefined)

    expect(reclassified?.name).toBe(classified?.name)
    expect(reclassified?.message).toBe(classified?.message)
    expect(reclassified?.stack).toBe(classified?.stack)
  })

  it.each([
    ['a RangeError of a too long string', new RangeError('Invalid string length')],
    ['an ordinary Error', new Error('Unable to parse the input')],
    ['a Rust Result error', jsError('Sequence is too short')],
    ['a value that is not an Error', 'unreachable'],
  ])('does not treat %s as fatal', (_, error) => {
    expect(classifyWasmError(error, { size: 1024, align: 8 })).toBeUndefined()
  })
})

describe('isFatalWasmErrorName', () => {
  it.each([
    [true, 'ErrorWasmOutOfMemory'],
    [true, 'ErrorInternalWasm'],
    [true, 'ErrorWasmUnknown'],
    [false, 'Error'],
    [false, 'RuntimeError'],
    [false, 'ErrorInternal'],
  ])('returns %s for %s', (expected, name) => {
    expect(isFatalWasmErrorName(name)).toBe(expected)
  })
})

/** Error as `wasm_bindgen::JsError` creates it from a Rust `Result` error: a plain `Error` with the text */
function jsError(message: string): Error {
  return new Error(message)
}
