import { Pool, spawn } from 'threads'

import { RunThread } from 'src/workers/worker.wasm'

export interface Pools2 {
  thread: RunThread
  pool: Pool<RunThread>
}

export async function createWorkerPools2(): Promise<Pools2> {
  if (typeof window !== 'undefined' || process.env.FORCE_USE_WORKERS === 'true') {
    const thread = await spawn<RunThread>(new Worker(new URL('./worker.wasm.ts', import.meta.url)))

    const pool = Pool<RunThread>(() => spawn(new Worker(new URL('./worker.wasm.ts', import.meta.url))), {
      size: 4,
      concurrency: 1,
      name: 'analyze',
      maxQueuedJobs: undefined,
    })

    return { thread, pool }
  }

  throw new Error(' createWorkerPools: unable to create worker pools')
}
