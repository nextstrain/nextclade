import { Pool, spawn, Worker } from 'threads'

import type { ParseThread } from './worker.parse'
import type { AnalyzeThread } from './worker.analyze'
import type { RunQcThread } from './worker.runQc'
import type { WorkerPools } from './types'

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

    const poolRunQc = Pool<RunQcThread>(() => spawn(new Worker('./worker.runQc.ts')), {
      size: NUM_RUN_QC_THREADS, // number of workers to spawn, defaults to the number of CPU cores
      concurrency: 1, // number of tasks to run simultaneously per worker, defaults to one
      name: 'runQc',
      maxQueuedJobs: undefined,
    })

    return { threadParse, poolAnalyze, poolRunQc }
  }

  throw new Error(' createWorkerPools: unable to create worker pools')
}
