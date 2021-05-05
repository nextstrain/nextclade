import { Pool, spawn, Worker } from 'threads'
import { concurrent } from 'fasy'

import type { WorkerPools } from 'src/workers/types'
import type { ParseThread } from 'src/workers/worker.parse'
import type { WasmWorker, WasmThread } from 'src/workers/worker.wasm'

const DEFAULT_NUM_THREADS = 4

export async function createWorkerPools2({ numThreads = DEFAULT_NUM_THREADS } = {}): Promise<WorkerPools> {
  // if (typeof window !== 'undefined' || process.env.FORCE_USE_WORKERS === 'true') {
  const threadParse = await spawn<ParseThread>(new Worker('./worker.parse.ts', { name: 'worker.parse' }))
  await threadParse.init()

  const threadWasm = await spawn<WasmThread>(new Worker('./worker.wasm.ts', { name: 'worker.wasm' }))
  await threadWasm.init()

  // const pool = Pool<WasmWorkerThread>(
  //   () => spawn<WasmWorker>(new Worker('./worker.wasm.ts', { name: 'worker.pool.wasm' })),
  //   {
  //     size: numThreads,
  //     concurrency: 1,
  //     name: 'wasm',
  //     maxQueuedJobs: undefined,
  //   },
  // )
  //
  // await concurrent.forEach(
  //   async () => pool.queue(async (worker: WasmWorkerThread) => worker.init()),
  //   Array.from({ length: numThreads }, () => undefined),
  // )

  return { threadParse, threadWasm }
  // }

  // throw new Error(' createWorkerPools: unable to create worker pools')
}
