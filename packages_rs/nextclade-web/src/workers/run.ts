/* eslint-disable unicorn/no-array-method-this-argument */
import { Pool, spawn as spawnBase } from 'threads'
import { concurrent } from 'fasy'

import type { SequenceParserResult } from 'src/algorithms/types'
import type { NextcladeParamsPojo } from 'src/gen/nextclade-wasm'
import { NextcladeWasmThread, NextcladeWasmWorker } from 'src/workers/nextcladeWasm.worker'

const WORKER_TIMEOUT_MS = 60 * 1000

/** Wraps `spawn()` from `threads` package to provide a custom initialization timeout interval */
export const spawn: typeof spawnBase = (worker: Worker) => {
  return spawnBase(worker, { timeout: WORKER_TIMEOUT_MS })
}

/**
 * Creates and initializes a pool of WebWorkers.
 * Note: perhaps frivolously, but words "WebWorker" and "thread" are used interchangeably throughout the code.
 */
export async function createAnalysisThreadPool(
  numThreads: number,
  params: NextcladeParamsPojo,
): Promise<Pool<NextcladeWasmThread>> {
  // Spawn the pool of WebWorkers
  const poolAnalyze = Pool<NextcladeWasmThread>(
    () => spawn<NextcladeWasmWorker>(new Worker(new URL('src/workers/nextcladeWasm.worker.ts', import.meta.url))),
    {
      size: numThreads,
      concurrency: 1,
      name: 'pool.analyze',
      maxQueuedJobs: undefined,
    },
  )

  // Initialize each WebWorker in the pool.
  // This instantiates and initializes webassembly module, and runs the constructor of the underlying C++ class.
  await concurrent.forEach(async (poolWorkerPromise: { init: Promise<NextcladeWasmThread> }) => {
    const worker = await poolWorkerPromise.init
    return worker.create(params)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
  }, poolAnalyze.workers)

  // Wait until pool is done initializing
  await poolAnalyze.settled(true)

  return poolAnalyze
}

/**
 * Destroys the analysis webworker pool.
 * Note: perhaps frivolously, but words "webworker" and "thread" are used interchangeably throughout the code.
 */
export async function destroyAnalysisThreadPool(poolAnalyze: Pool<NextcladeWasmThread>): Promise<void> {
  // Wait until pool has processed all the remaining queued sequences.
  await poolAnalyze.settled(true)

  // Destroy the WebWorkers in the pool.
  await concurrent.forEach(async (poolWorkerPromise: { init: Promise<NextcladeWasmThread> }) => {
    const worker = await poolWorkerPromise.init
    return worker.destroy()
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
  }, poolAnalyze.workers)

  // Terminate the analysis worker pool
  await poolAnalyze.terminate(true)
}

export async function createWorker(): Promise<NextcladeWasmThread> {
  return spawn<NextcladeWasmWorker>(new Worker(new URL('src/workers/nextcladeWasm.worker.ts', import.meta.url)))
}

export async function parseSequencesStreaming(
  fastaStr: string,
  onSequence: (seq: SequenceParserResult) => void,
  onError: (error: Error) => void,
  onComplete: () => void,
) {
  const thread = await createWorker()
  const subscription = thread.values().subscribe(onSequence, onError, onComplete)
  await thread.parseSequencesStreaming(fastaStr)
  await subscription.unsubscribe() // eslint-disable-line @typescript-eslint/await-thenable
}

export async function serializeToCsv(analysisResultsStr: string, delimiter: string) {
  return ''
}

export async function serializeInsertionsToCsv(analysisResultsStr: string) {
  return ''
}
