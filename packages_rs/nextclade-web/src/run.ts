import { Pool, spawn as spawnBase } from 'threads'
import { concurrent } from 'fasy'

import { AnalysisThread, AnalysisWorker } from 'src/workers/worker.analyze'

const WORKER_TIMEOUT_MS = 60 * 1000

/** Wraps `spawn()` from `threads` package to provide a custom initialization timeout interval */
export const spawn: typeof spawnBase = (worker: Worker) => {
  return spawnBase(worker, { timeout: WORKER_TIMEOUT_MS })
}

/**
 * Creates and initializes the analysis webworker pool.
 * Note: perhaps frivolously, but words "webworker" and "thread" are used interchangeably throughout the code.
 */
export async function createAnalysisThreadPool(numThreads: number): Promise<Pool<AnalysisThread>> {
  // Spawn the pool of analysis webworkers
  const poolAnalyze = Pool<AnalysisThread>(
    () => spawn<AnalysisWorker>(new Worker(new URL('src/workers/worker.analyze.ts', import.meta.url))),
    {
      size: numThreads,
      concurrency: 1,
      name: 'pool.analyze',
      maxQueuedJobs: undefined,
    },
  )

  // Initialize each webworker in the pool.
  // This instantiates and initializes webassembly module, and runs the constructor of the underlying C++ class.
  await concurrent.forEach(async (poolWorkerPromise: { init: Promise<AnalysisThread> }) => {
    const worker = await poolWorkerPromise.init
    return worker.create()
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
export async function destroyAnalysisThreadPool(poolAnalyze: Pool<AnalysisThread>): Promise<void> {
  // Wait until pool has processed all the remaining queued sequences.
  await poolAnalyze.settled(true)

  // Destroy the webworkers in the pool. This calls the destructor of the underlying C++ class.
  await concurrent.forEach(async (poolWorkerPromise: { init: Promise<AnalysisThread> }) => {
    const worker = await poolWorkerPromise.init
    return worker.destroy()
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
  }, poolAnalyze.workers)

  // Terminate the analysis worker pool
  await poolAnalyze.terminate(true)
}
