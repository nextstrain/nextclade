import { identity } from 'lodash'

import { Pool } from 'threads'
import type { Dispatch } from 'redux'
import { getContext, select, takeEvery, call, put, all } from 'redux-saga/effects'

import type { AnalysisResult } from 'src/algorithms/types'
import type { ParseThread } from 'src/workers/worker.parse'
import type { AnalyzeThread } from 'src/workers/worker.analyze'

import { WorkerPools } from 'src/workers/types'
import fsaSaga from 'src/state/util/fsaSaga'

import { selectParams } from './algorithm.selectors'
import { algorithmRunAsync, algorithmRunTrigger, parseAsync, analyzeAsync } from './algorithm.actions'

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
  yield put(analyzeAsync.started())

  try {
    const result = (yield call(analyze, params) as unknown) as AnalysisResult
    yield put(analyzeAsync.done(result))
  } catch (error) {
    yield put(analyzeAsync.failed(error))
  }
}

export function* workerAlgorithmRun() {
  const { poolParse, poolAnalyze } = (yield getContext('workerPools')) as WorkerPools
  const { input, rootSeq } = (yield select(selectParams) as unknown) as ReturnType<typeof selectParams>
  // const result = (yield call(run, { poolParse, poolAnalyze, ...params }) as unknown) as ReturnType<typeof run>

  yield put(parseAsync.started())
  const parsedSequences = (yield call(parse, { poolParse, input }) as unknown) as Record<string, string>
  const sequenceNames = Object.keys(parsedSequences)
  yield put(parseAsync.done(sequenceNames))

  const sequenceEntries = Object.entries(parsedSequences)
  yield all(sequenceEntries.map(([seqName, seq]) => call(analyzeOne, { poolAnalyze, seqName, seq, rootSeq })))
}

export default [takeEvery(algorithmRunTrigger, fsaSaga(algorithmRunAsync, workerAlgorithmRun))]
