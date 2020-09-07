import { zipWith, set } from 'lodash'

import { push } from 'connected-next-router'
import { Pool } from 'threads'
import { call, all, getContext, put, select, takeEvery } from 'typed-redux-saga'

import type { AuspiceJsonV2 } from 'auspice'
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
import type { RunQCParams } from 'src/algorithms/QC/runQC'
import type { WorkerPools } from 'src/workers/types'
import type { AnalyzeThread } from 'src/workers/worker.analyze'
import type { RunQcThread } from 'src/workers/worker.runQc'

import { assignClade } from 'src/algorithms/assignClade'
import { treePreprocess } from 'src/algorithms/tree/treePreprocess'
import { treeValidate } from 'src/algorithms/tree/treeValidate'
import { safeZip } from 'src/helpers/safeZip'
import { notUndefined } from 'src/helpers/notUndefined'
import { fsaSagaFromParams } from 'src/state/util/fsaSagaFromParams'
import fsaSaga from 'src/state/util/fsaSaga'
import { EXPORT_CSV_FILENAME, EXPORT_TSV_FILENAME, EXPORT_JSON_FILENAME } from 'src/constants'
import { saveFile } from 'src/helpers/saveFile'
import { serializeResultsToCsv, serializeResultsToJson } from 'src/io/serializeResults'
import { setShowInputBox } from 'src/state/ui/ui.actions'
import { auspiceStartClean } from 'src/state/auspice/auspice.actions'
import {
  analyzeAsync,
  exportCsvTrigger,
  exportTsvTrigger,
  exportJsonTrigger,
  parseAsync,
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
import { selectParams, selectResults } from 'src/state/algorithm/algorithm.selectors'

import auspiceDataOriginal from 'src/assets/data/ncov_small.json'
import { treePostProcess } from 'src/algorithms/tree/treePostprocess'
import { createAuspiceState } from 'src/state/auspice/createAuspiceState'
import { AuspiceTreeNodeExtended } from 'src/algorithms/tree/types'
import { selectQcRulesConfig } from 'src/state/settings/settings.selectors'

const parseSaga = fsaSagaFromParams(
  parseAsync,
  function* parseWorker(input: File | string) {
    const { threadParse } = yield* getContext<WorkerPools>('workerPools')
    const { input: newInput, parsedSequences } = yield* call(threadParse, input)
    return { input: newInput, parsedSequences }
  },
  function parseResultsTransformer({ parsedSequences }) {
    return Object.keys(parsedSequences)
  },
)

export interface AnalyzeParams extends AnalysisParams {
  poolAnalyze: Pool<AnalyzeThread>
}

export async function scheduleOneAnalysisRun({ poolAnalyze, seqName, seq, rootSeq }: AnalyzeParams) {
  return poolAnalyze.queue(async (analyze: AnalyzeThread) => analyze({ seqName, seq, rootSeq }))
}

const analyzeOne = fsaSagaFromParams(analyzeAsync, function* analyzeWorker(params: AnalysisParams) {
  const { poolAnalyze } = yield* getContext<WorkerPools>('workerPools')
  return yield* call(scheduleOneAnalysisRun, { poolAnalyze, ...params })
})

export interface ScheduleQcRunParams extends RunQCParams {
  poolRunQc: Pool<RunQcThread>
}

export async function runQcOne({ poolRunQc, analysisResult, privateMutations, qcRulesConfig }: ScheduleQcRunParams) {
  return poolRunQc.queue(async (runQc: RunQcThread) => runQc({ analysisResult, privateMutations, qcRulesConfig }))
}

const buildTreeSaga = fsaSagaFromParams(treeBuildAsync, function* buildTreeWorker(params: LocateInTreeParams) {
  const { threadTreeBuild } = yield* getContext<WorkerPools>('workerPools')
  return yield* call(threadTreeBuild, params)
})

const finalizeTreeSaga = fsaSagaFromParams(treeFinalizeAsync, function* finalizeTreeWorker(params: FinalizeTreeParams) {
  const { threadTreeFinalize } = yield* getContext<WorkerPools>('workerPools')
  return yield* call(threadTreeFinalize, params)
})

export function* prepare(content?: File | string) {
  yield* put(setAlgorithmGlobalStatus(AlgorithmGlobalStatus.started))
  yield* put(setShowInputBox(false))
  yield* put(push('/results'))

  if (typeof content === 'string') {
    yield* put(setInput(content))
  }

  const { rootSeq, input: inputState } = yield* select(selectParams)
  const input = content ?? inputState

  if (typeof input === 'string') {
    yield* put(setInputFile({ name: 'input.fasta', size: input.length }))
  } else if (input instanceof File) {
    const { name, size } = input
    yield* put(setInputFile({ name, size }))
  }

  return { input, rootSeq }
}

export function* parse(input: File | string) {
  yield* put(setAlgorithmGlobalStatus(AlgorithmGlobalStatus.parsing))
  const result = yield* parseSaga(input)

  if (!result) {
    return undefined
  }

  const { input: newInput, parsedSequences } = result

  if (newInput !== input) {
    yield* put(setInput(newInput))
  }

  return { parsedSequences }
}

export function* analyze(parsedSequences: Record<string, string>, rootSeq: string) {
  yield* put(setAlgorithmGlobalStatus(AlgorithmGlobalStatus.analysis))
  const sequenceEntries = Object.entries(parsedSequences)
  const analysisResultsRaw = yield* all(
    sequenceEntries.map(([seqName, seq]) => call(analyzeOne, { seqName, seq, rootSeq })),
  )
  const analysisResultsWithoutClades = analysisResultsRaw.filter(notUndefined)

  return { analysisResultsWithoutClades }
}

export function* treeFindNearestNodes(analysisResults: AnalysisResultWithoutClade[], rootSeq: string) {
  yield* put(setAlgorithmGlobalStatus(AlgorithmGlobalStatus.treeBuild))
  const auspiceData = treePreprocess(treeValidate(auspiceDataOriginal))
  return yield* buildTreeSaga({ analysisResults, rootSeq, auspiceData })
}

export function* assignClades(analysisResults: AnalysisResultWithoutClade[], matches: AuspiceTreeNodeExtended[]) {
  const resultsAndMatches = safeZip(analysisResults, matches)
  const clades = resultsAndMatches.map(([analysisResult, match]) => assignClade(analysisResult, match))
  yield* put(setClades(clades))
  const analysisResultsWithClades = safeZip(analysisResults, clades) // prettier-ignore
    .map(([analysisResult, { clade }]) => ({ ...analysisResult, clade }))
  return { analysisResultsWithClades }
}

export function* runQC(
  analysisResultsWithClades: AnalysisResultWithClade[],
  privateMutationSets: NucleotideSubstitution[][],
) {
  yield* put(setAlgorithmGlobalStatus(AlgorithmGlobalStatus.qc))
  const qcRulesConfig = yield* select(selectQcRulesConfig)
  const resultsAndDiffs = safeZip(analysisResultsWithClades, privateMutationSets)
  const { poolRunQc } = yield* getContext<WorkerPools>('workerPools')
  const qcResults = yield* all(
    resultsAndDiffs.map(([analysisResult, privateMutations]) =>
      call(runQcOne, { poolRunQc, analysisResult, privateMutations, qcRulesConfig }),
    ),
  )
  yield* put(setQcResults(qcResults))

  const results: AnalysisResult[] = zipWith(analysisResultsWithClades, qcResults, (ar, qc) => ({ ...ar, qc }))

  return { results }
}

export function* finalizeTree(
  auspiceData: AuspiceJsonV2,
  results: AnalysisResult[],
  matches: AuspiceTreeNodeExtended[],
  rootSeq: string,
) {
  yield* put(setAlgorithmGlobalStatus(AlgorithmGlobalStatus.treeFinalization))
  const result = yield* finalizeTreeSaga({ auspiceData, results, matches, rootSeq })

  if (!result) {
    return undefined
  }

  const { auspiceData: auspiceDataRaw } = result
  const auspiceDataPostprocessed = treePostProcess(auspiceDataRaw)

  return { auspiceDataPostprocessed }
}

export function* setAuspiceState(auspiceDataPostprocessed: AuspiceJsonV2) {
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
}

export function* runAlgorithm(content?: File | string) {
  const { input, rootSeq } = yield* prepare(content)

  const parseResult = yield* parse(input)
  if (!parseResult) {
    return
  }

  const { parsedSequences } = parseResult
  const { analysisResultsWithoutClades } = yield* analyze(parsedSequences, rootSeq)

  const findResult = yield* treeFindNearestNodes(analysisResultsWithoutClades, rootSeq)

  if (!findResult) {
    return
  }

  const { matches, privateMutationSets, auspiceData: auspiceDataRaw } = findResult
  const { analysisResultsWithClades } = yield* assignClades(analysisResultsWithoutClades, matches)

  const { results } = yield* runQC(analysisResultsWithClades, privateMutationSets)

  const finalizeResult = yield* finalizeTree(auspiceDataRaw, results, matches, rootSeq)
  if (!finalizeResult) {
    return
  }

  const { auspiceDataPostprocessed } = finalizeResult
  yield* setAuspiceState(auspiceDataPostprocessed)

  yield* put(setAlgorithmGlobalStatus(AlgorithmGlobalStatus.allDone))
}

export function* exportCsv() {
  const results = yield* select(selectResults)
  const str = yield* call(serializeResultsToCsv, results, ';')
  saveFile(str, EXPORT_CSV_FILENAME)
}

export function* exportTsv() {
  const results = yield* select(selectResults)
  const str = yield* call(serializeResultsToCsv, results, '\t')
  saveFile(str, EXPORT_TSV_FILENAME)
}

export function* exportJson() {
  const results = yield* select(selectResults)
  const str = yield* call(serializeResultsToJson, results)
  saveFile(str, EXPORT_JSON_FILENAME)
}

export default [
  takeEvery(algorithmRunAsync.trigger, fsaSaga(algorithmRunAsync, runAlgorithm)),
  takeEvery(exportCsvTrigger, exportCsv),
  takeEvery(exportTsvTrigger, exportTsv),
  takeEvery(exportJsonTrigger, exportJson),
]
