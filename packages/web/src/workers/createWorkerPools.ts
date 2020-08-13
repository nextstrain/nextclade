import { Pool, spawn, Worker } from 'threads'

import type { WorkerPools } from './types'
import type { ParseThread } from './worker.parse'
import type { AnalyzeThread } from './worker.analyze'
import type { TreeFinalizeThread } from './worker.treeFinalize'
import type { RunQcThread } from './worker.runQc'
import type { TreeBuildThread } from './worker.treeBuild'

const NUM_ANALYZER_THREADS = 4 as const
const NUM_RUN_QC_THREADS = 4 as const

export async function createWorkerPools(): Promise<WorkerPools> {
  if (typeof window !== 'undefined') {
    const threadParse = await spawn<ParseThread>(new Worker('./worker.parse.ts'))

    const poolAnalyze = Pool<AnalyzeThread>(() => spawn(new Worker('./worker.analyze.ts')), {
      size: NUM_ANALYZER_THREADS, // number of workers to spawn, defaults to the number of CPU cores
      concurrency: 1, // number of tasks to run simultaneously per worker, defaults to one
      name: 'analyze',
      maxQueuedJobs: undefined,
    })

    const threadTreeBuild = await spawn<TreeBuildThread>(new Worker('./worker.treeBuild.ts'))

    const poolRunQc = Pool<RunQcThread>(() => spawn(new Worker('./worker.runQc.ts')), {
      size: NUM_RUN_QC_THREADS, // number of workers to spawn, defaults to the number of CPU cores
      concurrency: 1, // number of tasks to run simultaneously per worker, defaults to one
      name: 'runQc',
      maxQueuedJobs: undefined,
    })

    const threadTreeFinalize = await spawn<TreeFinalizeThread>(new Worker('./worker.treeFinalize.ts'))

    return { threadParse, poolAnalyze, threadTreeBuild, poolRunQc, threadTreeFinalize }
  }

  throw new Error(' createWorkerPools: unable to create worker pools')
}
