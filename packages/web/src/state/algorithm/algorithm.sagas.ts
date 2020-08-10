import { identity, zipWith } from 'lodash'

import type { DeepPartial } from 'ts-essentials'
import { push } from 'connected-next-router'
import { Pool } from 'threads'
import type { Dispatch } from 'redux'
import { getContext, select, takeEvery, call, put, all } from 'redux-saga/effects'

import type { AnalysisResult, ParseResult } from 'src/algorithms/types'
import type { ParseReturn, ParseThread } from 'src/workers/worker.parse'
import type { AnalyzeThread } from 'src/workers/worker.analyze'
import type { RunQcThread } from 'src/workers/worker.runQc'
import type { WorkerPools } from 'src/workers/types'

import { finalizeTree, locateInTree } from 'src/algorithms/tree/locateInTree'
import type { QCResult, QCRulesConfig, RunQCParams } from 'src/algorithms/QC/runQC'

import { EXPORT_AUSPICE_JSON_V2_FILENAME, EXPORT_CSV_FILENAME, EXPORT_JSON_FILENAME } from 'src/constants'
import { saveFile } from 'src/helpers/saveFile'
import { serializeResultsToJson, serializeResultsToCsv, serializeResultsToAuspiceJsonV2 } from 'src/io/serializeResults'
import { AnalysisParams } from 'src/algorithms/types'

import fsaSaga from 'src/state/util/fsaSaga'
import { setShowInputBox } from 'src/state/ui/ui.actions'
import {
  algorithmRunAsync,
  algorithmRunTrigger,
  parseAsync,
  analyzeAsync,
  exportCsvTrigger,
  exportJsonTrigger,
  setInput,
  setInputFile,
  exportAuspiceJsonV2Trigger,
  runQcAsync,
} from './algorithm.actions'
import { selectParams, selectResults } from './algorithm.selectors'

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
  input: File | string
}

export async function parse({ poolParse, input }: ParseParams) {
  const taskParse = poolParse.queue(async (parse: ParseThread) => parse(input))
  return ((await taskParse.then(identity, rethrow)) as unknown) as ParseReturn
}

export interface AnalyzeParams extends AnalysisParams {
  poolAnalyze: Pool<AnalyzeThread>
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

export interface ScheduleQcRunParams extends RunQCParams {
  poolRunQc: Pool<RunQcThread>
}

export async function scheduleQcRun({ poolRunQc, analysisResult, auspiceData, qcRulesConfig }: ScheduleQcRunParams) {
  const task = poolRunQc.queue(async (runQc: RunQcThread) => runQc({ analysisResult, auspiceData, qcRulesConfig }))
  return task.then(identity, rethrow)
}

export function* runQcOne(params: ScheduleQcRunParams) {
  const { analysisResult: { seqName } } = params // prettier-ignore

  yield put(runQcAsync.started({ seqName }))

  try {
    const result = (yield call(scheduleQcRun, params) as unknown) as QCResult
    yield put(runQcAsync.done({ params: { seqName }, result }))
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    yield put(runQcAsync.failed({ params: { seqName }, error }))
  }
}

export function* workerAlgorithmRun(content?: File | string) {
  yield put(setShowInputBox(false))
  yield put(push('/results'))

  if (typeof content === 'string') {
    yield put(setInput(content))
  }

  const { poolParse, poolAnalyze, poolRunQc } = (yield getContext('workerPools')) as WorkerPools
  const params = (yield select(selectParams) as unknown) as ReturnType<typeof selectParams>
  const { rootSeq, input: inputState } = params
  const input = content ?? inputState

  if (typeof input === 'string') {
    yield put(setInputFile({ name: 'input.fasta', size: input.length }))
  } else if (input instanceof File) {
    const { name, size } = input
    yield put(setInputFile({ name, size }))
  }

  // TODO wrap into a function, handle errors
  yield put(parseAsync.started())
  const { input: newInput, parsedSequences } = (yield call(parse, { poolParse, input }) as unknown) as ParseResult
  const sequenceNames = Object.keys(parsedSequences)
  yield put(parseAsync.done({ result: sequenceNames }))

  if (newInput !== input) {
    yield put(setInput(newInput))
  }

  const sequenceEntries = Object.entries(parsedSequences)
  const analysisResults = (yield all(
    sequenceEntries.map(([seqName, seq]) => call(analyzeOne, { poolAnalyze, seqName, seq, rootSeq })),
  ) as unknown) as AnalysisResult[]

  const { matches, auspiceData } = locateInTree(analysisResults, rootSeq)

  const qcRulesConfig: DeepPartial<QCRulesConfig> = {
    divergence: {},
    missingData: {},
    snpClusters: {},
    mixedSites: {},
  }

  const qcResults = (yield all(
    analysisResults.map((analysisResult) => call(runQcOne, { poolRunQc, analysisResult, auspiceData, qcRulesConfig })),
  ) as unknown) as QCResult[]

  const tree = finalizeTree({ auspiceData, analysisResults, matches, qcResults, rootSeq })

  const results = zipWith(analysisResults, qcResults, (ar, qc) => ({ ...ar, qc }))

  yield { results, tree }
}

export function* exportCsv() {
  const results = (yield select(selectResults) as unknown) as ReturnType<typeof selectResults>
  const str = serializeResultsToCsv(results)
  saveFile(str, EXPORT_CSV_FILENAME)
}

export function* exportJson() {
  const results = (yield select(selectResults) as unknown) as ReturnType<typeof selectResults>
  const str = serializeResultsToJson(results)
  saveFile(str, EXPORT_JSON_FILENAME)
}

export function* exportAuspiceJsonV2() {
  const results = (yield select(selectResults) as unknown) as ReturnType<typeof selectResults>
  const str = serializeResultsToAuspiceJsonV2(results)
  saveFile(str, EXPORT_AUSPICE_JSON_V2_FILENAME)
}

export default [
  takeEvery(algorithmRunTrigger, fsaSaga(algorithmRunAsync, workerAlgorithmRun)),
  takeEvery(exportCsvTrigger, exportCsv),
  takeEvery(exportJsonTrigger, exportJson),
  takeEvery(exportAuspiceJsonV2Trigger, exportAuspiceJsonV2),
]
