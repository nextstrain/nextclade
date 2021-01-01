/* eslint-disable array-func/no-unnecessary-this-arg */
import { concurrent } from 'fasy'
import { Pool, spawn } from 'threads'

import type { WasmWorker, WasmWorkerThread } from 'src/workers/worker.wasm'

export interface Pools2 {
  thread: WasmWorkerThread
  pool: Pool<WasmWorkerThread>
}

const NUM_THREADS = 4

export async function createWorkerPools2(): Promise<Pools2> {
  if (typeof window !== 'undefined' || process.env.FORCE_USE_WORKERS === 'true') {
    const thread = await spawn<WasmWorker>(new Worker(new URL('./worker.wasm.ts', import.meta.url)))

    const pool = Pool<WasmWorkerThread>(
      () => spawn<WasmWorker>(new Worker(new URL('./worker.wasm.ts', import.meta.url))),
      {
        size: NUM_THREADS,
        concurrency: 1,
        name: 'wasm',
        maxQueuedJobs: undefined,
      },
    )

    await thread.init()

    await concurrent.forEach(
      async () => pool.queue(async (worker: WasmWorkerThread) => worker.init()),
      Array.from({ length: NUM_THREADS }, () => undefined),
    )

    return { pool, thread }
  }

  throw new Error(' createWorkerPools: unable to create worker pools')
}
