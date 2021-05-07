/* eslint-disable array-func/no-unnecessary-this-arg */
import { Pool, spawn, Worker } from 'threads'
import { concurrent } from 'fasy'

import type { ParseThread } from 'src/workers/worker.parse'
import type { AnalysisWorker, AnalysisThread } from 'src/workers/worker.analyze'
import type { TreePrepareThread } from 'src/workers/worker.treePrepare'
import type { TreeFinalizeThread } from 'src/workers/worker.treeFinalize'

export interface WorkerPools {
  threadTreePrepare: TreePrepareThread
  threadParse: ParseThread
  poolAnalyze: Pool<AnalysisThread>
  threadTreeFinalize: TreeFinalizeThread
}

const DEFAULT_NUM_THREADS = 4

export async function createWorkerPools({ numThreads = DEFAULT_NUM_THREADS } = {}): Promise<WorkerPools> {
  const threadTreePrepare = await spawn<TreePrepareThread>(new Worker('./worker.treePrepare.ts', { name: 'worker.treePrepare' })) // prettier-ignore
  await threadTreePrepare.init()

  const threadParse = await spawn<ParseThread>(new Worker('./worker.parse.ts', { name: 'worker.parse' }))
  await threadParse.init()

  const poolAnalyze = Pool<AnalysisThread>(
    () => spawn<AnalysisWorker>(new Worker('./worker.analyze.ts', { name: 'worker.analyze' })),
    {
      size: numThreads,
      concurrency: 1,
      name: 'wasm',
      maxQueuedJobs: undefined,
    },
  )

  await concurrent.forEach(
    async () => poolAnalyze.queue(async (worker: AnalysisThread) => worker.init()),
    Array.from({ length: numThreads }, () => undefined),
  )

  const threadTreeFinalize = await spawn<TreeFinalizeThread>(new Worker('./worker.treeFinalize.ts', { name: 'worker.treeFinalize' })) // prettier-ignore
  await threadTreeFinalize.init()

  return { threadTreePrepare, threadParse, poolAnalyze, threadTreeFinalize }
}
