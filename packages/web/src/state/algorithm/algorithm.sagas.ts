import { zipWith, set, get } from 'lodash'

import type { DeepPartial } from 'ts-essentials'
import type { Dispatch } from 'redux'
import { push } from 'connected-next-router'
import { Pool } from 'threads'
import { call, all, getContext, put, select, takeEvery } from 'typed-redux-saga'

import type { AuspiceTreeNode } from 'auspice'
import { changeColorBy } from 'auspice/src/actions/colors'

import type {
  AnalysisParams,
  AnalysisResult,
  AnalysisResultWithClade,
  AnalysisResultWithoutClade,
  NucleotideSubstitution,
} from 'src/algorithms/types'
import type { LocateInTreeParams } from 'src/algorithms/tree/treeFindNearestNodes'
import type { FinalizeTreeParams } from 'src/algorithms/tree/treeAttachNodes'
import type { QCResult, QCRulesConfig, RunQCParams } from 'src/algorithms/QC/runQC'
import type { WorkerPools } from 'src/workers/types'
import type { ParseThread } from 'src/workers/worker.parse'
import type { AnalyzeThread } from 'src/workers/worker.analyze'
import type { TreeBuildThread } from 'src/workers/worker.treeFindNearest'
import type { RunQcThread } from 'src/workers/worker.runQc'
import type { TreeFinalizeThread } from 'src/workers/worker.treeAttachNodes'

import { treePreprocess } from 'src/algorithms/tree/treePreprocess'
import { treeValidate } from 'src/algorithms/tree/treeValidate'
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
  setClades,
  setQcResults,
} from 'src/state/algorithm/algorithm.actions'
import { AlgorithmGlobalStatus } from 'src/state/algorithm/algorithm.state'
import { selectParams, selectResults, selectResultsArray } from 'src/state/algorithm/algorithm.selectors'

import auspiceDataOriginal from 'src/assets/data/ncov_small.json'
import { treePostProcess } from 'src/algorithms/tree/treePostprocess'
import { createAuspiceState } from 'src/state/auspice/createAuspiceState'

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
    const saneError = sanitizeError(error)
    console.error(saneError.message)
    yield* put(analyzeAsync.failed({ params: { seqName }, error: saneError }))
  }

  return result
}

export interface ScheduleQcRunParams extends RunQCParams {
  poolRunQc: Pool<RunQcThread>
}

export async function runQcOne({ poolRunQc, analysisResult, privateMutations, qcRulesConfig }: ScheduleQcRunParams) {
  return poolRunQc.queue(async (runQc: RunQcThread) => runQc({ analysisResult, privateMutations, qcRulesConfig }))
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
    const saneError = sanitizeError(error)
    console.error(saneError.message)
    yield* put(parseAsync.failed({ error: saneError }))
  }
  return undefined
}

function assignOneClade(analysisResult: AnalysisResultWithoutClade, match: AuspiceTreeNode) {
  const clade = get(match, 'node_attrs.clade_membership.value') as string | undefined
  if (!clade) {
    throw new Error('Unable to assign clade: best matching reference node does not have clade membership')
  }

  return { seqName: analysisResult.seqName, clade }
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
    const saneError = sanitizeError(error)
    console.error(saneError.message)
    yield* put(treeBuildAsync.failed({ params, error: saneError }))
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
    const saneError = sanitizeError(error)
    console.error(saneError.message)
    yield* put(treeFinalizeAsync.failed({ params, error: saneError }))
  }
  return undefined
}

export function* runAlgorithm(content?: File | string) {
  console.time('algorithm: whole')
  console.time('algorithm: init')

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

  console.timeEnd('algorithm: init')
  console.time('algorithm: parse')

  yield* put(setAlgorithmGlobalStatus(AlgorithmGlobalStatus.parsing))
  const parseResult = yield* call(parseSaga, { threadParse, input })
  if (!parseResult) {
    return undefined
  }

  const { input: newInput, parsedSequences } = parseResult
  if (newInput !== input) {
    yield* put(setInput(newInput))
  }

  console.timeEnd('algorithm: parse')
  console.time('algorithm: analyze')
  yield* put(setAlgorithmGlobalStatus(AlgorithmGlobalStatus.analysis))
  const sequenceEntries = Object.entries(parsedSequences)
  const analysisResultsRaw = yield* all(
    sequenceEntries.map(([seqName, seq]) => call(analyzeOne, { poolAnalyze, seqName, seq, rootSeq })),
  )
  const analysisResultsWithoutClades = analysisResultsRaw.filter(notUndefined)

  console.timeEnd('algorithm: analyze')
  console.time('algorithm: tree build')
  yield* put(setAlgorithmGlobalStatus(AlgorithmGlobalStatus.treeBuild))
  const auspiceDataPreprocessed = treePreprocess(treeValidate(auspiceDataOriginal))
  const treeBuildResult = yield* call(buildTreeSaga, {
    threadTreeBuild,
    params: { analysisResults: analysisResultsWithoutClades, rootSeq, auspiceData: auspiceDataPreprocessed },
  })
  if (!treeBuildResult) {
    return undefined
  }

  const { matches, privateMutationSets, auspiceData: auspiceDataRaw } = treeBuildResult

  console.timeEnd('algorithm: tree build')

  // TODO: move to the previous webworker when tree build is parallel
  console.time('algorithm: zip results and matches')
  const resultsAndMatches = safeZip(analysisResultsWithoutClades, matches)
  console.timeEnd('algorithm: zip results and matches')

  console.time('algorithm: assign clades')
  const clades = resultsAndMatches.map(([analysisResult, match]) => assignOneClade(analysisResult, match))
  yield* put(setClades(clades))
  const analysisResultsWithClades = safeZip(analysisResultsWithoutClades, clades) // prettier-ignore
    .map(([analysisResult, { clade }]) => ({ ...analysisResult, clade }))
  console.timeEnd('algorithm: assign clades')

  // TODO: move this to user-controlled state
  const qcRulesConfig: DeepPartial<QCRulesConfig> = {
    privateMutations: {},
    missingData: {},
    snpClusters: {},
    mixedSites: {},
  }

  yield* put(setAlgorithmGlobalStatus(AlgorithmGlobalStatus.qc))
  console.time('algorithm: qc')
  const resultsAndDiffs = safeZip(analysisResultsWithClades, privateMutationSets)
  const qcResults = yield* all(
    resultsAndDiffs.map(([analysisResult, privateMutations]) =>
      call(runQcOne, { poolRunQc, analysisResult, privateMutations, qcRulesConfig }),
    ),
  )
  yield* put(setQcResults(qcResults))
  console.timeEnd('algorithm: qc')

  console.time('algorithm: zip results and qc results')
  const results: AnalysisResult[] = zipWith(analysisResultsWithClades, qcResults, (ar, qc) => ({ ...ar, qc }))
  console.timeEnd('algorithm: zip results and qc results')

  console.time('algorithm: tree finalize')
  yield* put(setAlgorithmGlobalStatus(AlgorithmGlobalStatus.treeFinalization))
  const treeFinalizeResult = yield* call(finalizeTreeSaga, {
    threadTreeFinalize,
    params: { auspiceData: auspiceDataRaw, results, matches, rootSeq },
  })
  if (!treeFinalizeResult) {
    return undefined
  }
  const { auspiceData } = treeFinalizeResult

  console.timeEnd('algorithm: tree finalize')
  console.time('algorithm: tree postprocess')

  const auspiceDataPostprocessed = treePostProcess(auspiceData)
  console.timeEnd('algorithm: tree postprocess')
  console.time('algorithm: create auspice state')

  const auspiceState = createAuspiceState(auspiceDataPostprocessed)

  // HACK: now that we are in the main process, we can re-attach the `controls.colorScale.scale` function we previously set to undefined in the worker process.
  // This is because transferring between webworker processes uses structured cloning algorithm and functions are not supported.
  // https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm
  // We attach a dummy function, because the original function is no longer available.
  // Ideally, the state should not contain functions. This is something to discuss in auspice upstream.
  set(auspiceState, 'controls.colorScale.scale', () => '#AAAAAA')
  yield* put(auspiceStartClean(auspiceState))

  // HACK: Now we restore the `controls.colorScale.scale` function to the correct one by emulating action of changing "Color By"
  yield* put(changeColorBy())

  console.timeEnd('algorithm: create auspice state')

  yield* put(setAlgorithmGlobalStatus(AlgorithmGlobalStatus.allDone))

  console.timeEnd('algorithm: whole')
  return { results, auspiceData: auspiceDataPostprocessed }
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
