import { Pool, spawn, Worker } from 'threads'
import { concurrent } from 'fasy'

import type { WorkerPools } from 'src/workers/types'
import type { ParseThread } from 'src/workers/worker.parse'
import type { AnalysisThread } from 'src/workers/worker.wasm'
import type { TreePrepareThread } from 'src/workers/worker.treePrepare'
import type { TreeFinalizeThread } from 'src/workers/worker.treeFinalize'

const DEFAULT_NUM_THREADS = 4

export async function createWorkerPools2({ numThreads = DEFAULT_NUM_THREADS } = {}): Promise<WorkerPools> {
  const threadTreePrepare = await spawn<TreePrepareThread>(new Worker('./worker.treePrepare.ts', { name: 'worker.treePrepare' })) // prettier-ignore
  await threadTreePrepare.init()

  const threadParse = await spawn<ParseThread>(new Worker('./worker.parse.ts', { name: 'worker.parse' }))
  await threadParse.init()

  const threadWasm = await spawn<AnalysisThread>(new Worker('./worker.wasm.ts', { name: 'worker.wasm' }))
  await threadWasm.init()

  const threadTreeFinalize = await spawn<TreeFinalizeThread>(new Worker('./worker.treeFinalize.ts', { name: 'worker.treeFinalize' })) // prettier-ignore
  await threadTreeFinalize.init()

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

  return { threadTreePrepare, threadParse, threadWasm, threadTreeFinalize }
}
