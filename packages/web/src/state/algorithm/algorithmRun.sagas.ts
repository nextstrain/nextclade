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

import { auspiceStartClean, treeFilterByNodeType } from 'src/state/auspice/auspice.actions'
import {
  algorithmRunAsync,
  algorithmRunWithSequencesAsync,
  analyzeAsync,
  parseAsync,
  setAlgorithmGlobalStatus,
  setFasta,
  setOutputTree,
  treeFinalizeAsync,
} from 'src/state/algorithm/algorithm.actions'
import { AlgorithmGlobalStatus, AlgorithmInput } from 'src/state/algorithm/algorithm.state'

import { treePostProcess } from 'src/algorithms/tree/treePostprocess'
import { createAuspiceState } from 'src/state/auspice/createAuspiceState'
import { loadFasta } from './algorithmInputs.sagas'
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

export function* runAlgorithmWithSequences(inputSeq: AlgorithmInput) {
  const loadFastaSaga = fsaSaga(setFasta, loadFasta)
  yield* loadFastaSaga(setFasta.trigger(inputSeq))

  const errors: Error[] = yield* select((state: State) => state.algorithm.params.errors.seqData)
  if (errors.length > 0) {
    return
  }

  yield* runAlgorithm()
}

export function* runAlgorithm() {
  yield* put(setAlgorithmGlobalStatus(AlgorithmGlobalStatus.started))
  yield* put(push('/results'))

  const { seqData, virus } = yield* select((state: State) => state.algorithm.params)

  if (!seqData) {
    throw new Error('No sequence data provided')
  }

  const { rootSeq, minimalLength, pcrPrimers, geneMap, auspiceData: auspiceDataReference, qcRulesConfig } = virus
  const auspiceData = treePreprocess(copy(auspiceDataReference), rootSeq)

  const parseResult = yield* parse(seqData)
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
  yield* put(treeFilterByNodeType(['New']))
  yield* put(setAlgorithmGlobalStatus(AlgorithmGlobalStatus.allDone))
}

export default [
  takeEvery(algorithmRunWithSequencesAsync.trigger, fsaSaga(algorithmRunWithSequencesAsync, runAlgorithmWithSequences)),
  takeEvery(algorithmRunAsync.trigger, fsaSaga(algorithmRunAsync, runAlgorithm)),
]
