import {
  analysisErrorAction,
  canDestroyPoolWorkers,
  canStartWorkerReplacement,
} from 'src/workers/workerLifecycle'

describe('analysisErrorAction', () => {
  it('replaces the worker and reports the message on the third fatal error of a run', () => {
    const error = fatalError('ErrorInternalWasm', 'panicked at src/align/align.rs:10:5')

    expect(analysisErrorAction(error, 2)).toStrictEqual({
      type: 'replaceWorker',
      message: 'panicked at src/align/align.rs:10:5',
    })
  })

  it('fails the run on the fourth fatal error of a run', () => {
    const error = fatalError('ErrorWasmOutOfMemory', 'Nextclade Web ran out of browser memory')

    expect(analysisErrorAction(error, 3)).toStrictEqual({ type: 'rethrow' })
  })

  it('fails the run on a non-fatal error, also before any fatal error', () => {
    expect(analysisErrorAction(new Error('Sequence is too short'), 0)).toStrictEqual({ type: 'rethrow' })
  })

  it('fails the run on a thrown value that is not an error', () => {
    expect(analysisErrorAction('ErrorInternalWasm', 0)).toStrictEqual({ type: 'rethrow' })
  })
})

describe('analysis pool lifecycle', () => {
  it('replaces no worker after the pool started closing', () => {
    expect(canStartWorkerReplacement({ isClosing: false, numPendingReplacements: 1 })).toBe(true)
    expect(canStartWorkerReplacement({ isClosing: true, numPendingReplacements: 1 })).toBe(false)
  })

  it('destroys the workers of a closing pool only after every pending replacement has finished', () => {
    expect(canDestroyPoolWorkers({ isClosing: true, numPendingReplacements: 1 })).toBe(false)
    expect(canDestroyPoolWorkers({ isClosing: true, numPendingReplacements: 0 })).toBe(true)
  })

  it('does not destroy the workers of an open pool', () => {
    expect(canDestroyPoolWorkers({ isClosing: false, numPendingReplacements: 0 })).toBe(false)
  })
})

function fatalError(name: string, message: string): Error {
  const error = new Error(message)
  error.name = name
  return error
}
