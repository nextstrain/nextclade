import type { Worker as ThreadsJsWorker } from 'threads'
import { spawn as spawnBase } from 'threads'

const WORKER_TIMEOUT_MS = 60 * 1000

/**
 * Wraps `spawn()` from `threads` package to provide a custom initialization timeout interval.
 *
 * Terminates the worker when its initialization fails, because a worker that starts after the timeout would otherwise
 * stay alive without an owner.
 */
export async function spawn<SpawnedWorkerType>(worker: ThreadsJsWorker): Promise<SpawnedWorkerType> {
  try {
    return (await spawnBase(worker, { timeout: WORKER_TIMEOUT_MS })) as unknown as SpawnedWorkerType
  } catch (error: unknown) {
    await worker.terminate()
    throw error
  }
}
