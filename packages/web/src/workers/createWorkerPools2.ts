import { concurrent } from 'fasy'
import { Pool, spawn } from 'threads'

import { RunThread } from 'src/workers/worker.wasm'

export interface Pools2 {
  thread: RunThread
  pool: Pool<RunThread>
}

const NUM_THREADS = 4

export async function createWorkerPools2(): Promise<Pools2> {
  if (typeof window !== 'undefined' || process.env.FORCE_USE_WORKERS === 'true') {
    const thread = await spawn<RunThread>(new Worker(new URL('./worker.wasm.ts', import.meta.url)))

    const pool = Pool<RunThread>(() => spawn(new Worker(new URL('./worker.wasm.ts', import.meta.url))), {
      size: NUM_THREADS,
      concurrency: 1,
      name: 'analyze',
      maxQueuedJobs: undefined,
    })

    await thread.init()

    await concurrent.forEach(
      async () => pool.queue(async (worker) => worker.init()),
      Array.from({ length: NUM_THREADS }, () => undefined),
    )

    return { thread, pool }
  }

  throw new Error(' createWorkerPools: unable to create worker pools')
}
