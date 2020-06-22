import { identity } from 'lodash'

import type { DeepReadonly } from 'ts-essentials'
import { spawn, Pool, Worker } from 'threads'
import { concurrent } from 'fasy'

import type { AlgorithmParams } from './types'
import type { ParseThread } from './worker.parse'
import type { AnalyzeReturn, AnalyzeThread } from './worker.analyze'

const NUM_PARSER_THREADS = 1 as const
const NUM_ANALYZER_THREADS = 4 as const

let runImpl = async (args: AlgorithmParams): Promise<AnalyzeReturn[]> => {
  return Promise.reject(new Error('Web workers are not supported'))
}

if (typeof window !== 'undefined') {
  const poolParse = Pool<ParseThread>(() => spawn(new Worker('./worker.parse.ts')), {
    size: NUM_PARSER_THREADS, // number of workers to spawn, defaults to the number of CPU cores
    concurrency: 1, // number of tasks to run simultaneously per worker, defaults to one
    name: 'parse',
    maxQueuedJobs: undefined,
  })

  const poolAnalyze = Pool<AnalyzeThread>(() => spawn(new Worker('./worker.analyze.ts')), {
    size: NUM_ANALYZER_THREADS, // number of workers to spawn, defaults to the number of CPU cores
    concurrency: 1, // number of tasks to run simultaneously per worker, defaults to one
    name: 'analyze',
    maxQueuedJobs: undefined,
  })

  runImpl = async ({ input, rootSeq }: DeepReadonly<AlgorithmParams>): Promise<AnalyzeReturn[]> => {
    const taskParse = poolParse.queue(async (parse: ParseThread) => parse(input))

    const parsedSequences = ((await taskParse.then(identity, identity)) as unknown) as Record<string, string>

    const entries = Object.entries(parsedSequences)

    return concurrent.map(([seqName, seq]) => {
      return (poolAnalyze
        .queue(async (analyze: AnalyzeThread) => analyze({ seqName, seq, rootSeq }))
        .then(identity, identity) as unknown) as AnalyzeReturn
      // eslint-disable-next-line array-func/no-unnecessary-this-arg
    }, entries)
  }
}

export async function runInWorker(args: AlgorithmParams) {
  return runImpl(args)
}
