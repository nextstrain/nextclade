import { identity } from 'lodash'

import { Pool } from 'threads'
import type { Dispatch } from 'redux'
import { getContext, select, takeEvery, call, put, all, takeLatest } from 'redux-saga/effects'

import type { AnalysisResult } from 'src/algorithms/types'
import type { ParseThread } from 'src/workers/worker.parse'
import type { AnalyzeThread } from 'src/workers/worker.analyze'

import { WorkerPools } from 'src/workers/types'
import fsaSaga from 'src/state/util/fsaSaga'

import { selectParams } from './algorithm.selectors'
import {
  algorithmRunAsync,
  algorithmRunTrigger,
  parseAsync,
  analyzeAsync,
  setInput,
  setParams,
} from './algorithm.actions'

export interface RunParams extends WorkerPools {
  rootSeq: string
  input: string
  dispatch: Dispatch
}

export function rethrow<T>(e: T) {
  throw e
}

export interface ParseParams {
  poolParse: Pool<ParseThread>
  input: string
}

export async function parse({ poolParse, input }: ParseParams) {
  const taskParse = poolParse.queue(async (parse: ParseThread) => parse(input))
  return ((await taskParse.then(identity, rethrow)) as unknown) as Record<string, string>
}

export interface AnalyzeParams {
  poolAnalyze: Pool<AnalyzeThread>
  seqName: string
  seq: string
  rootSeq: string
}

export async function analyze({ poolAnalyze, seqName, seq, rootSeq }: AnalyzeParams) {
  const task = poolAnalyze.queue(async (analyze: AnalyzeThread) => analyze({ seqName, seq, rootSeq }))
  return task.then(identity, rethrow)
}

export function* analyzeOne(params: AnalyzeParams) {
  const { seqName } = params
  yield put(analyzeAsync.started({ seqName }))

  try {
    const result = (yield call(analyze, params) as unknown) as AnalysisResult
    yield put(analyzeAsync.done({ params: { seqName }, result }))
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    yield put(analyzeAsync.failed({ params: { seqName }, error }))
  }
}

export function* workerAlgorithmRun() {
  const { poolParse, poolAnalyze } = (yield getContext('workerPools')) as WorkerPools
  const params = (yield select(selectParams) as unknown) as ReturnType<typeof selectParams>
  const { rootSeq } = params

  // TODO wrap into a function, handle errors
  yield put(parseAsync.started())
  const parsedSequences = (yield call(parse, { poolParse, ...params }) as unknown) as Record<string, string>
  const sequenceNames = Object.keys(parsedSequences)
  yield put(parseAsync.done({ result: sequenceNames }))

  const sequenceEntries = Object.entries(parsedSequences)
  yield all(sequenceEntries.map(([seqName, seq]) => call(analyzeOne, { poolAnalyze, seqName, seq, rootSeq })))
}

export function* rerun() {
  yield put(algorithmRunTrigger())
}

export default [
  takeEvery(algorithmRunTrigger, fsaSaga(algorithmRunAsync, workerAlgorithmRun)),
  takeLatest(setInput, rerun),
  takeLatest(setParams, rerun),
]
