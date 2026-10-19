import {
  analysisErrorAction,
  canCallExportWorker,
  canDestroyPoolWorkers,
  canStartWorkerReplacement,
  canTerminateExportWorker,
  shouldReleaseSingleton,
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

describe('export worker lifecycle', () => {
  it('accepts calls only while active', () => {
    expect(canCallExportWorker({ phase: 'active', numCallsInProgress: 2 })).toBe(true)
    expect(canCallExportWorker({ phase: 'retired', numCallsInProgress: 2 })).toBe(false)
    expect(canCallExportWorker({ phase: 'terminated', numCallsInProgress: 0 })).toBe(false)
  })

  it('defers the termination of a retired worker until its calls in progress have settled', () => {
    expect(canTerminateExportWorker({ phase: 'retired', numCallsInProgress: 5 })).toBe(false)
    expect(canTerminateExportWorker({ phase: 'retired', numCallsInProgress: 0 })).toBe(true)
  })

  it('terminates neither an active worker nor a terminated worker', () => {
    expect(canTerminateExportWorker({ phase: 'active', numCallsInProgress: 0 })).toBe(false)
    expect(canTerminateExportWorker({ phase: 'terminated', numCallsInProgress: 0 })).toBe(false)
  })

  it('releases the singleton when it holds the retiring worker', () => {
    const retiring = { id: 'retiring' }

    expect(shouldReleaseSingleton(retiring, retiring)).toBe(true)
  })

  it('keeps the singleton when a newer worker has replaced the retiring worker', () => {
    const retiring = { id: 'retiring' }
    const newer = { id: 'newer' }

    expect(shouldReleaseSingleton(newer, retiring)).toBe(false)
    expect(shouldReleaseSingleton(undefined, retiring)).toBe(false)
  })
})

function fatalError(name: string, message: string): Error {
  const error = new Error(message)
  error.name = name
  return error
}
