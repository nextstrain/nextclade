import type { Worker as ThreadsJsWorker } from 'threads'
import { spawn as spawnBase } from 'threads'

const WORKER_TIMEOUT_MS = 60 * 1000

/** Wraps `spawn()` from `threads` package to provide a custom initialization timeout interval */
export function spawn<SpawnedWorkerType>(worker: Worker) {
  return spawnBase(worker as unknown as ThreadsJsWorker, {
    timeout: WORKER_TIMEOUT_MS,
  }) as unknown as Promise<SpawnedWorkerType>
}
