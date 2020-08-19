import { zipWith, set, get } from 'lodash'

import type { DeepPartial } from 'ts-essentials'
import type { Dispatch } from 'redux'
import { push } from 'connected-next-router'
import { Pool } from 'threads'
import { call, all, getContext, put, select, takeEvery } from 'typed-redux-saga'

import type { AuspiceTreeNode } from 'auspice'
import { changeColorBy } from 'auspice/src/actions/colors'

import type { AnalysisParams, AnalysisResult, AnalysisResultWithoutClade } from 'src/algorithms/types'
import type { FinalizeTreeParams, LocateInTreeParams } from 'src/algorithms/tree/locateInTree'
import type { QCResult, QCRulesConfig, RunQCParams } from 'src/algorithms/QC/runQC'
import type { WorkerPools } from 'src/workers/types'
import type { ParseThread } from 'src/workers/worker.parse'
import type { AnalyzeThread } from 'src/workers/worker.analyze'
import type { TreeBuildThread } from 'src/workers/worker.treeBuild'
import type { RunQcThread } from 'src/workers/worker.runQc'
import type { TreeFinalizeThread } from 'src/workers/worker.treeFinalize'

import { safeZip } from 'src/helpers/safeZip'
import { notUndefined } from 'src/helpers/notUndefined'
import { sanitizeError } from 'src/helpers/sanitizeError'
import fsaSaga from 'src/state/util/fsaSaga'
import { EXPORT_AUSPICE_JSON_V2_FILENAME, EXPORT_CSV_FILENAME, EXPORT_JSON_FILENAME } from 'src/constants'
import { saveFile } from 'src/helpers/saveFile'
import { serializeResultsToAuspiceJsonV2, serializeResultsToCsv, serializeResultsToJson } from 'src/io/serializeResults'
import { setShowInputBox } from 'src/state/ui/ui.actions'
import { auspiceStartClean } from 'src/state/auspice/auspice.actions'
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
  assignClade,
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

  let result: AnalysisResultWithoutClade | undefined
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

export async function scheduleOneQcRun({
  poolRunQc,
  analysisResult,
  mutationsDiff,
  qcRulesConfig,
}: ScheduleQcRunParams) {
  return poolRunQc.queue(async (runQc: RunQcThread) => runQc({ analysisResult, mutationsDiff, qcRulesConfig }))
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

function* assignOneClade(analysisResult: AnalysisResultWithoutClade, match: AuspiceTreeNode) {
  const clade = get(match, 'node_attrs.clade_membership.value') as string | undefined
  if (!clade) {
    throw new Error('Unable to assign clade: best matching reference node does not have clade membership')
  }

  yield* put(assignClade({ seqName: analysisResult.seqName, clade }))
  return { ...analysisResult, clade }
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
  const analysisResultsWithoutClades = analysisResultsRaw.filter(notUndefined)

  yield* put(setAlgorithmGlobalStatus(AlgorithmGlobalStatus.treeBuild))
  const treeBuildResult = yield* call(buildTreeSaga, {
    threadTreeBuild,
    params: { analysisResults: analysisResultsWithoutClades },
  })
  if (!treeBuildResult) {
    return undefined
  }

  const { matches, mutationsDiffs } = treeBuildResult

  // TODO: move to the previous webworker when tree build is parallel
  const resultsAndMatches = safeZip(analysisResultsWithoutClades, matches)
  const analysisResultsWithClades = yield* all(
    resultsAndMatches.map(([analysisResult, match]) => call(assignOneClade, analysisResult, match)),
  )

  // TODO: move this to user-controlled state
  const qcRulesConfig: DeepPartial<QCRulesConfig> = {
    divergence: {},
    missingData: {},
    snpClusters: {},
    mixedSites: {},
  }

  yield* put(setAlgorithmGlobalStatus(AlgorithmGlobalStatus.qc))
  const resultsAndDiffs = safeZip(analysisResultsWithClades, mutationsDiffs)
  const qcResults = yield* all(
    resultsAndDiffs.map(([analysisResult, mutationsDiff]) =>
      call(runQcOne, { poolRunQc, analysisResult, mutationsDiff, qcRulesConfig }),
    ),
  )

  const results: AnalysisResult[] = zipWith(analysisResultsWithClades, qcResults, (ar, qc) => ({ ...ar, qc }))

  yield* put(setAlgorithmGlobalStatus(AlgorithmGlobalStatus.treeFinalization))
  const treeFinalizeResult = yield* call(finalizeTreeSaga, {
    threadTreeFinalize,
    params: { results, matches, rootSeq },
  })
  if (!treeFinalizeResult) {
    return undefined
  }
  const { auspiceData, auspiceState } = treeFinalizeResult

  // HACK: now that we are in the main process, we can re-attach the `controls.colorScale.scale` function we previously set to undefined in the worker process.
  // This is because transferring between webworker processes uses structured cloning algorithm and functions are not supported.
  // https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm
  // We attach a dummy function, because the original function is no longer available.
  // Ideally, the state should not contain functions. This is something to discuss in auspice upstream.
  set(auspiceState, 'controls.colorScale.scale', () => '#AAAAAA')
  yield* put(auspiceStartClean(auspiceState))

  // HACK: Now we restore the `controls.colorScale.scale` function to the correct one by emulating action of changing "Color By"
  yield* put(changeColorBy())

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
