import type { StrictOmit } from 'ts-essentials'
import type { AuspiceJsonV2 } from 'auspice'
import copy from 'fast-copy'
import { push } from 'connected-next-router'
import { Pool } from 'threads'
import { call, all, getContext, put, select, takeEvery } from 'typed-redux-saga'
import { changeColorBy } from 'auspice/src/actions/colors'

import type { AlgorithmParams, AnalysisParams } from 'src/algorithms/types'
import type { FinalizeTreeParams } from 'src/algorithms/tree/treeAttachNodes'
import type { WorkerPools } from 'src/workers/types'
import type { AnalyzeThread } from 'src/workers/worker.analyze'

import { treePreprocess } from 'src/algorithms/tree/treePreprocess'

import { notUndefined } from 'src/helpers/notUndefined'
import { fsaSagaFromParams } from 'src/state/util/fsaSagaFromParams'
import fsaSaga from 'src/state/util/fsaSaga'
import {
  EXPORT_CSV_FILENAME,
  EXPORT_TSV_FILENAME,
  EXPORT_JSON_FILENAME,
  EXPORT_AUSPICE_JSON_V2_FILENAME,
} from 'src/constants'
import { saveFile } from 'src/helpers/saveFile'
import { serializeResultsToCsv, serializeResultsToJson } from 'src/io/serializeResults'
import { setShowInputBox } from 'src/state/ui/ui.actions'
import { auspiceStartClean } from 'src/state/auspice/auspice.actions'
import {
  analyzeAsync,
  exportCsvTrigger,
  exportTsvTrigger,
  exportJsonTrigger,
  exportTreeJsonTrigger,
  parseAsync,
  setAlgorithmGlobalStatus,
  algorithmRunAsync,
  treeFinalizeAsync,
  setOutputTree,
} from 'src/state/algorithm/algorithm.actions'
import { AlgorithmGlobalStatus } from 'src/state/algorithm/algorithm.state'
import { selectOutputTree, selectResults } from 'src/state/algorithm/algorithm.selectors'

import { treePostProcess } from 'src/algorithms/tree/treePostprocess'
import { createAuspiceState } from 'src/state/auspice/createAuspiceState'
import { State } from '../reducer'

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

export async function scheduleOneAnalysisRun({
  poolAnalyze,
  ...params
}: AnalysisParams & { poolAnalyze: Pool<AnalyzeThread> }) {
  return poolAnalyze.queue(async (analyze: AnalyzeThread) => analyze(params))
}

const analyzeOne = fsaSagaFromParams(analyzeAsync, function* analyzeWorker(params: AnalysisParams) {
  const { poolAnalyze } = yield* getContext<WorkerPools>('workerPools')
  return yield* call(scheduleOneAnalysisRun, { poolAnalyze, ...params })
})

const finalizeTreeSaga = fsaSagaFromParams(treeFinalizeAsync, function* finalizeTreeWorker(params: FinalizeTreeParams) {
  const { threadTreeFinalize } = yield* getContext<WorkerPools>('workerPools')
  return yield* call(threadTreeFinalize, params)
})

export function* prepare() {
  const params = yield* select((state: State) => state.algorithm.params)

  if (!params.raw.seqData) {
    throw new Error('No sequence data provided')
  }

  const { virus } = params
  const content = yield* call(params.raw.seqData.getContent)

  yield* put(setAlgorithmGlobalStatus(AlgorithmGlobalStatus.started))
  yield* put(setShowInputBox(false))
  yield* put(push('/results'))

  return { content, virus }
}

export function* parse(input: File | string) {
  yield* put(setAlgorithmGlobalStatus(AlgorithmGlobalStatus.parsing))
  const result = yield* parseSaga(input)

  if (!result) {
    return undefined
  }

  const { parsedSequences } = result

  return { parsedSequences }
}

export function* analyze(
  parsedSequences: Record<string, string>,
  params: StrictOmit<AnalysisParams, 'seqName' | 'seq'>,
) {
  yield* put(setAlgorithmGlobalStatus(AlgorithmGlobalStatus.analysis))
  const sequenceEntries = Object.entries(parsedSequences)
  const analysisResultsRaw = yield* all(
    sequenceEntries.map(([seqName, seq]) => call(analyzeOne, { seqName, seq, ...params })),
  )
  return analysisResultsRaw.filter(notUndefined)
}

export function* setAuspiceState(auspiceDataPostprocessed: AuspiceJsonV2) {
  const auspiceState = createAuspiceState(auspiceDataPostprocessed)
  yield* put(auspiceStartClean(auspiceState))
  yield* put(changeColorBy())
}

export function* runAlgorithm() {
  const { content, virus } = yield* prepare()
  const { rootSeq, minimalLength, pcrPrimers, geneMap, auspiceData: auspiceDataReference, qcRulesConfig } = virus
  const auspiceData = treePreprocess(copy(auspiceDataReference), rootSeq)

  const parseResult = yield* parse(content)
  if (!parseResult) {
    return
  }

  const { parsedSequences } = parseResult
  const results = yield* analyze(parsedSequences, {
    rootSeq,
    minimalLength,
    pcrPrimers,
    geneMap,
    auspiceData,
    qcRulesConfig,
  })

  yield* put(setAlgorithmGlobalStatus(AlgorithmGlobalStatus.treeFinalization))
  const auspiceDataNew = yield* finalizeTreeSaga({ results, auspiceData, rootSeq })
  if (!auspiceDataNew) {
    return
  }

  const auspiceDataPostprocessed = treePostProcess(auspiceDataNew)
  yield* put(setOutputTree(JSON.stringify(auspiceDataPostprocessed, null, 2)))
  yield* setAuspiceState(auspiceDataPostprocessed)
  yield* put(setAlgorithmGlobalStatus(AlgorithmGlobalStatus.allDone))
}

export function* exportCsv() {
  const results = yield* select(selectResults)
  const str = yield* call(serializeResultsToCsv, results, ';')
  saveFile(str, EXPORT_CSV_FILENAME, 'text/csv;charset=utf-8')
}

export function* exportTsv() {
  const results = yield* select(selectResults)
  const str = yield* call(serializeResultsToCsv, results, '\t')
  saveFile(str, EXPORT_TSV_FILENAME, 'text/tab-separated-values;charset=utf-8')
}

export function* exportJson() {
  const results = yield* select(selectResults)
  const str = yield* call(serializeResultsToJson, results)
  saveFile(str, EXPORT_JSON_FILENAME, 'application/json;charset=utf-8')
}

export function* exportTreeJson() {
  const auspiceDataStr = yield* select(selectOutputTree)
  if (auspiceDataStr) {
    saveFile(auspiceDataStr, EXPORT_AUSPICE_JSON_V2_FILENAME, 'application/json;charset=utf-8')
  }
}

export default [
  // takeEvery(algorithmRunAsync.trigger, fsaSaga(algorithmRunAsync, runAlgorithm)),
  takeEvery(exportCsvTrigger, exportCsv),
  takeEvery(exportTsvTrigger, exportTsv),
  takeEvery(exportJsonTrigger, exportJson),
  takeEvery(exportTreeJsonTrigger, exportTreeJson),
]
