import { concurrent } from 'fasy'
import { Pool, spawn, Worker } from 'threads'
import { call, all, getContext, put, select, takeEvery, apply } from 'typed-redux-saga'

import fsaSaga from 'src/state/util/fsaSaga'

import {
  algorithmRunAsync,
  // algorithmRunWithSequencesAsync,
  setAlgorithmGlobalStatus,
} from 'src/state/algorithm/algorithm.actions'
import { AlgorithmGlobalStatus } from 'src/state/algorithm/algorithm.state'
import {
  parseGeneMapGffString,
  parsePcrPrimersCsvString,
  parseQcConfigString,
  parseRefSequence,
  parseSequencesStreaming,
  treeFinalize,
  treePrepare,
} from 'src/workers/run'

import type {
  AnalysisThread,
  AnalysisWorker,
  NextcladeWasmParams,
  NextcladeWasmResult,
} from 'src/workers/worker.analyze'
import type { ParseSeqResult } from 'src/workers/types'

import refFastaStr from '../../../../../data/sars-cov-2/reference.fasta'
import treeJson from '../../../../../data/sars-cov-2/tree.json'
import geneMapStrRaw from '../../../../../data/sars-cov-2/genemap.gff'
import qcConfigRaw from '../../../../../data/sars-cov-2/qc.json'
import pcrPrimersStrRaw from '../../../../../data/sars-cov-2/primers.csv'
import queryStr from '../../../../../data/sars-cov-2/sequences.fasta'

const DEFAULT_NUM_THREADS = 4
const numThreads = DEFAULT_NUM_THREADS // FIXME: detect number of threads

// ***********************************************************************************************************
// export function* setAuspiceState(auspiceDataPostprocessed: AuspiceJsonV2) {
//   const auspiceState = createAuspiceState(auspiceDataPostprocessed)
//   yield* put(auspiceStartClean(auspiceState))
//   yield* put(changeColorBy())
// }
// ***********************************************************************************************************

export function* runAlgorithm() {
  yield* put(setAlgorithmGlobalStatus(AlgorithmGlobalStatus.started))
  // yield* put(push('/results'))
  // ***********************************************************************************************************

  const refStr = yield* call(parseRefSequence, refFastaStr)
  const treePreparedStr = yield* call(treePrepare, JSON.stringify(treeJson), refStr)

  const geneMapName = 'genemap.gff'
  const pcrPrimersFilename = 'primers.csv'

  const geneMapStr = yield* call(parseGeneMapGffString, geneMapStrRaw, geneMapName)
  const qcConfigStr = yield* call(parseQcConfigString, JSON.stringify(qcConfigRaw))
  const pcrPrimersStr = yield* call(parsePcrPrimersCsvString, pcrPrimersStrRaw, pcrPrimersFilename, refStr)

  console.log('poolAnalyze spawn')
  const poolAnalyze = Pool<AnalysisThread>(
    () => spawn<AnalysisWorker>(new Worker('src/workers/worker.analyze.ts', { name: 'worker.analyze' })),
    {
      size: numThreads,
      concurrency: 1,
      name: 'wasm',
      maxQueuedJobs: undefined,
    },
  )

  yield* apply(poolAnalyze, poolAnalyze.settled, [true])

  const params: NextcladeWasmParams = {
    refStr,
    geneMapStr,
    geneMapName,
    treePreparedStr,
    pcrPrimersStr,
    pcrPrimersFilename,
    qcConfigStr,
  }

  console.log('worker.init')
  yield* call(async () =>
    concurrent.forEach(
      async () => poolAnalyze.queue(async (worker: AnalysisThread) => worker.init(params)),
      Array.from({ length: numThreads }, () => undefined),
    ),
  )

  const nextcladeResults: NextcladeWasmResult[] = []
  const status = { parserDone: true, pendingAnalysis: 0 }

  function onSequence(seq: ParseSeqResult) {
    status.pendingAnalysis += 1
    console.log({ seq })

    poolAnalyze.queue((worker) => {
      return worker.analyze(seq).then((nextcladeResult) => {
        console.log({ nextcladeResult })
        nextcladeResults.push(nextcladeResult)
        status.pendingAnalysis -= 1
      })
    })
  }

  function onError(error: Error) {
    console.error(error)
  }

  function onComplete() {
    status.parserDone = true
  }

  console.log('parseSequencesStreaming')
  yield* call(parseSequencesStreaming, queryStr, onSequence, onError, onComplete)

  console.log('poolAnalyze.settled')
  yield* apply(poolAnalyze, poolAnalyze.settled, [true])

  console.log('destroy')
  yield* call(async () =>
    concurrent.forEach(
      async () => poolAnalyze.queue(async (worker: AnalysisThread) => worker.destroy()),
      Array.from({ length: numThreads }, () => undefined),
    ),
  )

  console.log('poolAnalyze.terminate')
  yield* apply(poolAnalyze, poolAnalyze.terminate, [true])

  const analysisResults = nextcladeResults.map((nextcladeResult) => nextcladeResult.analysisResult)
  const analysisResultsStr = JSON.stringify(analysisResults)

  console.log('treeFinalize')
  const treeFinalStr = yield* call(treeFinalize, treePreparedStr, refStr, analysisResultsStr)

  console.log({ nextcladeResults })
  console.log({ tree: JSON.parse(treeFinalStr) })

  // ***********************************************************************************************************
  // yield* put(setOutputTree(JSON.stringify(auspiceDataPostprocessed, null, 2)))
  // yield* setAuspiceState(auspiceDataPostprocessed)
  // yield* put(treeFilterByNodeType(['New']))
  // yield* put(setAlgorithmGlobalStatus(AlgorithmGlobalStatus.allDone))
}

export default [
  // takeEvery(algorithmRunWithSequencesAsync.trigger, fsaSaga(algorithmRunWithSequencesAsync, runAlgorithmWithSequences)),
  takeEvery(algorithmRunAsync.trigger, fsaSaga(algorithmRunAsync, runAlgorithm)),
]
