import { Pool, spawn as spawnBase, Worker as ThreadsJsWorker, Thread } from 'threads'
import { concurrent } from 'fasy'

import type { FastaRecord } from 'src/algorithms/types'
import type { NextcladeParamsPojo } from 'src/gen/nextclade-wasm'
import type { NextcladeWasmThread, NextcladeWasmWorker } from 'src/workers/nextcladeWasm.worker'
import type { GoThread } from 'src/workers/go.worker'

const WORKER_TIMEOUT_MS = 60 * 1000

/** Wraps `spawn()` from `threads` package to provide a custom initialization timeout interval */
export function spawn<SpawnedWorkerType>(worker: Worker) {
  return spawnBase(worker as unknown as ThreadsJsWorker, {
    timeout: WORKER_TIMEOUT_MS,
  }) as unknown as Promise<SpawnedWorkerType>
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

  const nextcladeWorkerModule = new Worker(new URL('src/workers/nextcladeWasm.worker.ts', import.meta.url), {
    name: 'nextcladeWebWorker',
  })
  const poolAnalyze = Pool<NextcladeWasmThread>(() => spawn<NextcladeWasmThread>(nextcladeWorkerModule), {
    size: numThreads,
    concurrency: 1,
    name: 'pool.analyze',
    maxQueuedJobs: undefined,
  })

  // Initialize each WebWorker in the pool.
  // This instantiates and initializes webassembly module, and runs the constructor of the underlying C++ class.
  await concurrent.forEach(async (poolWorkerPromise: { init: Promise<NextcladeWasmThread> }) => {
    const worker = await poolWorkerPromise.init
    return worker.create(params)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
  }, poolAnalyze.workers) // eslint-disable-line @typescript-eslint/no-unsafe-argument

  // Wait until pool is done initializing
  await poolAnalyze.settled(true)

  return poolAnalyze
}

/** Retrieves the first worker in the pool */
export async function getFirstWorker<ThreadType extends Thread>(pool: Pool<ThreadType>) {
  // HACK: Typings for the 'threads' library don't include the `.workers` field on the `Pool<>`
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return (await pool.workers?.[0]?.init) as ThreadType
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
  }, poolAnalyze.workers) // eslint-disable-line @typescript-eslint/no-unsafe-argument

  // Terminate the analysis worker pool
  await poolAnalyze.terminate(true)
}

export async function createGoWorker(): Promise<GoThread> {
  const goWorkerModule = new Worker(new URL('src/workers/go.worker.ts', import.meta.url), { name: 'launcherWebWorker' })
  return spawn<GoThread>(goWorkerModule)
}

export async function parseSequencesStreaming(
  fastaStr: string,
  onSequence: (seq: FastaRecord) => void,
  onError: (error: Error) => void,
  onComplete: () => void,
) {
  const thread = await spawn<NextcladeWasmWorker>(
    new Worker(new URL('src/workers/nextcladeWasm.worker.ts', import.meta.url)),
  )
  const subscription = thread.values().subscribe(onSequence, onError, onComplete)
  await thread.parseSequencesStreaming(fastaStr)
  await subscription.unsubscribe() // eslint-disable-line @typescript-eslint/await-thenable
  await thread.destroy()
}

export async function serializeToCsv(analysisResultsStr: string, delimiter: string) {
  return ''
}

export async function serializeInsertionsToCsv(analysisResultsStr: string) {
  return ''
}
