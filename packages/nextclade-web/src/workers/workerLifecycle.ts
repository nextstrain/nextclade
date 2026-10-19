import { isFatalWasmErrorName } from 'src/helpers/ErrorWasm'

/**
 * Number of fatal WebAssembly errors per analysis run after which the analysis pool still replaces the worker.
 *
 * A defect that affects the whole dataset fails on every sequence, so the next fatal error fails the run instead of
 * replacing workers without end.
 */
export const MAX_WORKER_REPLACEMENTS_PER_RUN = 3

/**
 * Size of the WebAssembly memory of an analysis worker, in bytes, above which the analysis pool replaces the worker.
 *
 * WebAssembly memory grows and never shrinks, so a worker keeps the high-water mark of its largest alignment for the
 * rest of the run. In an mpox run, ordinary workers used 270-330 MB, and the worker that aligned a sequence with a band
 * of 424M cells grew to 3.8 GB. The limit lies far from both, so that ordinary workers are kept and a worker that
 * served a huge alignment returns its memory to the browser.
 */
export const MAX_WORKER_WASM_MEMORY_BYTES = 1024 * 1024 * 1024

/** Return `true` if an analysis worker whose WebAssembly memory has the given size in bytes is to be replaced */
export function shouldReplaceWorkerForMemory(wasmMemoryBytes: number): boolean {
  return wasmMemoryBytes > MAX_WORKER_WASM_MEMORY_BYTES
}

/** Return `true` if the error means that the WebAssembly instance which threw it is broken */
export function isFatalWasmError(error: unknown): error is Error {
  return error instanceof Error && isFatalWasmErrorName(error.name)
}

/** Decide the action after an error in the analysis of one sequence, given the earlier fatal errors of the run */
export function analysisErrorAction(error: unknown, numFatalErrorsBefore: number): AnalysisErrorAction {
  if (isFatalWasmError(error) && numFatalErrorsBefore < MAX_WORKER_REPLACEMENTS_PER_RUN) {
    return { type: 'replaceWorker', message: error.message }
  }
  return { type: 'rethrow' }
}

/**
 * Action of the analysis pool after an error in the analysis of one sequence:
 *  - `replaceWorker`: report the error `message` for this sequence only and replace the broken worker
 *  - `rethrow`: fail the run with the error
 */
export type AnalysisErrorAction = { type: 'replaceWorker'; message: string } | { type: 'rethrow' }

/** Lifecycle state of the analysis pool, as seen by worker replacement and termination */
export interface AnalysisPoolLifecycle {
  /** `terminate()` has been called */
  isClosing: boolean
  /** Number of worker replacements that have started and not yet finished */
  numPendingReplacements: number
}

/**
 * Return `true` if the pool may start a worker replacement, or let a created one take over tasks. A closing pool
 * installs no new workers, so that no task runs on a replacement that termination would not wait for.
 */
export function canStartWorkerReplacement({ isClosing }: AnalysisPoolLifecycle): boolean {
  return !isClosing
}

/**
 * Return `true` if a closing pool may send `destroy()` to its workers. A pending replacement terminates the thread it
 * replaces, and calls to a terminated thread never settle, so the pool first waits for every pending replacement.
 */
export function canDestroyPoolWorkers({ isClosing, numPendingReplacements }: AnalysisPoolLifecycle): boolean {
  return isClosing && numPendingReplacements === 0
}

/**
 * Lifecycle phase of an export worker:
 *  - `active`: the worker accepts calls
 *  - `retired`: the worker refuses new calls and waits for its calls in progress to settle
 *  - `terminated`: the Web Worker is terminated
 */
export type ExportWorkerPhase = 'active' | 'retired' | 'terminated'

/** Lifecycle state of an export worker */
export interface ExportWorkerLifecycle {
  phase: ExportWorkerPhase
  /** Number of calls sent to the Web Worker that have not yet settled */
  numCallsInProgress: number
}

/** Return `true` if the export worker accepts a new call */
export function canCallExportWorker({ phase }: ExportWorkerLifecycle): boolean {
  return phase === 'active'
}

/**
 * Return `true` if a retired export worker may terminate its Web Worker now. Terminating a thread does not reject its
 * pending calls, so termination waits until every call in progress has settled.
 */
export function canTerminateExportWorker({ phase, numCallsInProgress }: ExportWorkerLifecycle): boolean {
  return phase === 'retired' && numCallsInProgress === 0
}

/**
 * Return `true` if retiring a worker also releases the singleton. The singleton is released only while it still holds
 * the retiring worker, because a newer worker may have replaced it already.
 */
export function shouldReleaseSingleton<T>(singleton: T | undefined, retiring: T): boolean {
  return singleton === retiring
}
