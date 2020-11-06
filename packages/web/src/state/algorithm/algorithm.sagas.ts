import type { StrictOmit } from 'ts-essentials'
import type { AuspiceJsonV2 } from 'auspice'
import copy from 'fast-copy'
import { push } from 'connected-next-router'
import { Pool } from 'threads'
import { call, all, getContext, put, select, takeEvery } from 'typed-redux-saga'
import { changeColorBy } from 'auspice/src/actions/colors'

import type { AnalysisParams } from 'src/algorithms/types'
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
  setInput,
  setInputFile,
  algorithmRunAsync,
  treeFinalizeAsync,
  setOutputTree,
} from 'src/state/algorithm/algorithm.actions'
import { AlgorithmGlobalStatus } from 'src/state/algorithm/algorithm.state'
import { selectOutputTree, selectParams, selectResults } from 'src/state/algorithm/algorithm.selectors'

import { treePostProcess } from 'src/algorithms/tree/treePostprocess'
import { createAuspiceState } from 'src/state/auspice/createAuspiceState'

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

export function* prepare(content?: File | string) {
  yield* put(setAlgorithmGlobalStatus(AlgorithmGlobalStatus.started))
  yield* put(setShowInputBox(false))
  yield* put(push('/results'))

  if (typeof content === 'string') {
    yield* put(setInput(content))
  }

  const { sequenceDatum, virus } = yield* select(selectParams)
  const input = content ?? sequenceDatum

  if (typeof input === 'string') {
    yield* put(setInputFile({ name: 'example.fasta', size: input.length }))
  } else if (input instanceof File) {
    const { name, size } = input
    yield* put(setInputFile({ name, size }))
  }

  return { input, virus }
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

export function* runAlgorithm(content?: File | string) {
  const { input, virus } = yield* prepare(content)
  const { rootSeq, minimalLength, pcrPrimers, geneMap, auspiceData: auspiceDataReference, qcRulesConfig } = virus
  const auspiceData = treePreprocess(copy(auspiceDataReference), rootSeq)

  const parseResult = yield* parse(input)
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
  takeEvery(algorithmRunAsync.trigger, fsaSaga(algorithmRunAsync, runAlgorithm)),
  takeEvery(exportCsvTrigger, exportCsv),
  takeEvery(exportTsvTrigger, exportTsv),
  takeEvery(exportJsonTrigger, exportJson),
  takeEvery(exportTreeJsonTrigger, exportTreeJson),
]
