import { zipWith } from 'lodash'

import type { DeepPartial } from 'ts-essentials'
import type { Dispatch } from 'redux'
import { push } from 'connected-next-router'
import { Pool } from 'threads'
import { call, all, getContext, put, select, takeEvery } from 'typed-redux-saga'

import type { AnalysisParams, AnalysisResult } from 'src/algorithms/types'
import type { FinalizeTreeParams, LocateInTreeParams } from 'src/algorithms/tree/locateInTree'
import type { QCResult, QCRulesConfig, RunQCParams } from 'src/algorithms/QC/runQC'
import type { WorkerPools } from 'src/workers/types'
import type { ParseThread } from 'src/workers/worker.parse'
import type { AnalyzeThread } from 'src/workers/worker.analyze'
import type { TreeBuildThread } from 'src/workers/worker.treeBuild'
import type { RunQcThread } from 'src/workers/worker.runQc'
import type { TreeFinalizeThread } from 'src/workers/worker.treeFinalize'

import { notUndefined } from 'src/helpers/notUndefined'
import { sanitizeError } from 'src/helpers/sanitizeError'
import fsaSaga from 'src/state/util/fsaSaga'
import { EXPORT_AUSPICE_JSON_V2_FILENAME, EXPORT_CSV_FILENAME, EXPORT_JSON_FILENAME } from 'src/constants'
import { saveFile } from 'src/helpers/saveFile'
import { serializeResultsToAuspiceJsonV2, serializeResultsToCsv, serializeResultsToJson } from 'src/io/serializeResults'
import { setShowInputBox } from 'src/state/ui/ui.actions'
import {
  algorithmRunTrigger,
  analyzeAsync,
  exportAuspiceJsonV2Trigger,
  exportCsvTrigger,
  exportJsonTrigger,
  parseAsync,
  runQcAsync,
  setAlgorithmGlobalStatus,
  setInput,
  setInputFile,
  algorithmRunAsync,
  treeBuildAsync,
  treeFinalizeAsync,
} from './algorithm.actions'
import { selectParams, selectResults } from './algorithm.selectors'
import { AlgorithmGlobalStatus } from './algorithm.state'

export interface RunParams extends WorkerPools {
  rootSeq: string
  input: string
  dispatch: Dispatch
}

export interface AnalyzeParams extends AnalysisParams {
  poolAnalyze: Pool<AnalyzeThread>
}

export async function scheduleOneAnalysisRun({ poolAnalyze, seqName, seq, rootSeq }: AnalyzeParams) {
  return poolAnalyze.queue(async (analyze: AnalyzeThread) => analyze({ seqName, seq, rootSeq }))
}

export function* analyzeOne(params: AnalyzeParams) {
  const { seqName } = params
  yield* put(analyzeAsync.started({ seqName }))

  let result: AnalysisResult | undefined
  try {
    result = yield* call(scheduleOneAnalysisRun, params)
    yield* put(analyzeAsync.done({ params: { seqName }, result }))
  } catch (error) {
    yield* put(analyzeAsync.failed({ params: { seqName }, error: sanitizeError(error) }))
  }

  return result
}

export interface ScheduleQcRunParams extends RunQCParams {
  poolRunQc: Pool<RunQcThread>
}

export async function scheduleOneQcRun({ poolRunQc, analysisResult, auspiceData, qcRulesConfig }: ScheduleQcRunParams) {
  return poolRunQc.queue(async (runQc: RunQcThread) => runQc({ analysisResult, auspiceData, qcRulesConfig }))
}

export function* runQcOne(params: ScheduleQcRunParams) {
  const { analysisResult: { seqName } } = params // prettier-ignore

  yield* put(runQcAsync.started({ seqName }))

  let result: QCResult | undefined
  try {
    const result = yield* call(scheduleOneQcRun, params)
    yield* put(runQcAsync.done({ params: { seqName }, result }))
  } catch (error) {
    yield* put(runQcAsync.failed({ params: { seqName }, error: sanitizeError(error) }))
  }

  return result
}

export interface ParseParams {
  threadParse: ParseThread
  input: File | string
}

export function* parseSaga({ threadParse, input }: ParseParams) {
  yield* put(parseAsync.started())
  try {
    const { input: newInput, parsedSequences } = yield* call(threadParse, input)
    const sequenceNames = Object.keys(parsedSequences)
    yield* put(parseAsync.done({ result: sequenceNames }))
    return { input: newInput, parsedSequences }
  } catch (error) {
    yield* put(parseAsync.failed({ error: sanitizeError(error) }))
  }
  return undefined
}

export interface TreeBuildParams {
  threadTreeBuild: TreeBuildThread
  params: LocateInTreeParams
}

export function* buildTreeSaga({ threadTreeBuild, params }: TreeBuildParams) {
  yield* put(treeBuildAsync.started(params))
  try {
    const result = yield* call(threadTreeBuild, params)
    yield* put(treeBuildAsync.done({ params, result }))
    return result
  } catch (error) {
    yield* put(treeBuildAsync.failed({ params, error: sanitizeError(error) }))
  }
  return undefined
}

export interface TreeFinalizeParams {
  threadTreeFinalize: TreeFinalizeThread
  params: FinalizeTreeParams
}

export function* finalizeTreeSaga({ threadTreeFinalize, params }: TreeFinalizeParams) {
  yield* put(treeFinalizeAsync.started(params))
  try {
    const result = yield* call(threadTreeFinalize, params)
    yield* put(treeFinalizeAsync.done({ params, result }))
    return result
  } catch (error) {
    if (error instanceof Error) {
      yield* put(treeFinalizeAsync.failed({ params, error }))
      treeFinalizeAsync.failed({ params, error: sanitizeError(error) })
    }
  }
  return undefined
}

export function* runAlgorithm(content?: File | string) {
  yield* put(setAlgorithmGlobalStatus(AlgorithmGlobalStatus.started))
  yield* put(setShowInputBox(false))
  yield* put(push('/results'))

  if (typeof content === 'string') {
    yield* put(setInput(content))
  }

  const { threadParse, poolAnalyze, threadTreeBuild, poolRunQc, threadTreeFinalize } =
    yield* getContext<WorkerPools>('workerPools') // prettier-ignore

  const { rootSeq, input: inputState } = yield* select(selectParams)
  const input = content ?? inputState

  if (typeof input === 'string') {
    yield* put(setInputFile({ name: 'input.fasta', size: input.length }))
  } else if (input instanceof File) {
    const { name, size } = input
    yield* put(setInputFile({ name, size }))
  }

  yield* put(setAlgorithmGlobalStatus(AlgorithmGlobalStatus.parsing))
  const parseResult = yield* call(parseSaga, { threadParse, input })
  if (!parseResult) {
    return undefined
  }

  const { input: newInput, parsedSequences } = parseResult
  if (newInput !== input) {
    yield* put(setInput(newInput))
  }

  yield* put(setAlgorithmGlobalStatus(AlgorithmGlobalStatus.analysis))
  const sequenceEntries = Object.entries(parsedSequences)
  const analysisResultsRaw = yield* all(
    sequenceEntries.map(([seqName, seq]) => call(analyzeOne, { poolAnalyze, seqName, seq, rootSeq })),
  )
  const analysisResults = analysisResultsRaw.filter(notUndefined)

  yield* put(setAlgorithmGlobalStatus(AlgorithmGlobalStatus.treeBuild))
  const treeBuildResult = yield* call(buildTreeSaga, { threadTreeBuild, params: { analysisResults, rootSeq } })
  if (!treeBuildResult) {
    return undefined
  }

  const { matches, auspiceData: auspiceDataRaw } = treeBuildResult

  const qcRulesConfig: DeepPartial<QCRulesConfig> = {
    divergence: {},
    missingData: {},
    snpClusters: {},
    mixedSites: {},
  }

  yield* put(setAlgorithmGlobalStatus(AlgorithmGlobalStatus.qc))
  const qcResults = yield* all(
    analysisResults.map((analysisResult) =>
      call(runQcOne, { poolRunQc, analysisResult, auspiceData: auspiceDataRaw, qcRulesConfig }),
    ),
  )

  const results: AnalysisResult[] = zipWith(analysisResults, qcResults, (ar, qc) => ({ ...ar, qc }))

  yield* put(setAlgorithmGlobalStatus(AlgorithmGlobalStatus.treeFinalization))
  const treeFinalizeResult = yield* call(finalizeTreeSaga, {
    threadTreeFinalize,
    params: { auspiceData: auspiceDataRaw, results, matches, rootSeq },
  })
  if (!treeFinalizeResult) {
    return undefined
  }
  const { auspiceData } = treeFinalizeResult
  yield* put(setAlgorithmGlobalStatus(AlgorithmGlobalStatus.allDone))
  return { results, auspiceData }
}

export function* exportCsv() {
  const results = yield* select(selectResults)
  const str = serializeResultsToCsv(results)
  saveFile(str, EXPORT_CSV_FILENAME)
}

export function* exportJson() {
  const results = yield* select(selectResults)
  const str = serializeResultsToJson(results)
  saveFile(str, EXPORT_JSON_FILENAME)
}

export function* exportAuspiceJsonV2() {
  const results = yield* select(selectResults)
  const str = serializeResultsToAuspiceJsonV2(results)
  saveFile(str, EXPORT_AUSPICE_JSON_V2_FILENAME)
}

export default [
  takeEvery(algorithmRunTrigger, fsaSaga(algorithmRunAsync, runAlgorithm)),
  takeEvery(exportCsvTrigger, exportCsv),
  takeEvery(exportJsonTrigger, exportJson),
  takeEvery(exportAuspiceJsonV2Trigger, exportAuspiceJsonV2),
]
