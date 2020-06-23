import { identity } from 'lodash'

import type { DeepReadonly } from 'ts-essentials'
import type { Dispatch } from 'redux'
import { concurrent } from 'fasy'
import { SagaIterator } from 'redux-saga'
import { getContext, select, takeEvery, call } from 'redux-saga/effects'

import type { ParseThread } from 'src/workers/worker.parse'
import type { AnalyzeReturn, AnalyzeThread } from 'src/workers/worker.analyze'

import { WorkerPools } from 'src/workers/types'
import fsaSaga from 'src/state/util/fsaSaga'

import { selectParams } from './algorithm.selectors'
import { algorithmRunAsync, AlgorithmRunResults, algorithmRunTrigger } from './algorithm.actions'

export interface RunParams extends WorkerPools {
  rootSeq: string
  input: string
  dispatch: Dispatch
}

async function run({ poolParse, poolAnalyze, input, rootSeq }: DeepReadonly<RunParams>): Promise<AnalyzeReturn[]> {
  // console.log({ poolParse, poolAnalyze, input, rootSeq })

  const taskParse = poolParse.queue(async (parse: ParseThread) => parse(input))

  console.log({ taskParse })

  const parsedSequences = ((await taskParse.then(identity, identity)) as unknown) as Record<string, string>

  console.log({ parsedSequences })

  const entries = Object.entries(parsedSequences)

  return concurrent.map(([seqName, seq]) => {
    return (poolAnalyze
      .queue(async (analyze: AnalyzeThread) => analyze({ seqName, seq, rootSeq }))
      .then(identity, identity) as unknown) as AnalyzeReturn
    // eslint-disable-next-line array-func/no-unnecessary-this-arg
  }, entries)
}

// export async function runInWorker(args: AlgorithmParams) {
//   return run(args)
// }

export function* workerAlgorithmRun(): SagaIterator | AlgorithmRunResults {
  const { poolParse, poolAnalyze } = (yield getContext('workerPools')) as WorkerPools
  const params = (yield select(selectParams) as unknown) as ReturnType<typeof selectParams>
  const result = (yield call(run, { poolParse, poolAnalyze, ...params }) as unknown) as ReturnType<typeof run>
  return result
}

export default [takeEvery(algorithmRunTrigger, fsaSaga(algorithmRunAsync, workerAlgorithmRun))]
