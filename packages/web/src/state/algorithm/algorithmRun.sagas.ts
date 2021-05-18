/* eslint-disable no-loops/no-loops,no-continue,promise/always-return,array-func/no-unnecessary-this-arg,no-void */
import type { EventChannel } from 'redux-saga'

import { concurrent } from 'fasy'
import { Pool, spawn, Worker } from 'threads'
import { eventChannel, buffers } from 'redux-saga'
import { call, put, takeEvery, apply, take, all } from 'typed-redux-saga'

import fsaSaga from 'src/state/util/fsaSaga'

import {
  algorithmRunAsync,
  // algorithmRunWithSequencesAsync,
  setAlgorithmGlobalStatus,
} from 'src/state/algorithm/algorithm.actions'
import { AlgorithmGlobalStatus } from 'src/state/algorithm/algorithm.state'
import {
  createThreadParseSequencesStreaming,
  parseGeneMapGffString,
  parsePcrPrimersCsvString,
  parseQcConfigString,
  parseRefSequence,
  treeFinalize,
  treePrepare,
} from 'src/workers/run'

import type {
  AnalysisThread,
  AnalysisWorker,
  NextcladeWasmParams,
  NextcladeWasmResult,
} from 'src/workers/worker.analyze'
import { ParseSequencesStreamingThread } from 'src/workers/worker.parseSequencesStreaming'
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

export interface SequenceParserChannelElement {
  seq?: ParseSeqResult
  error?: Error
  isDone?: boolean
}

/**
 * Subscribes to observable stream from sequence parser and queues the results (parsed sequences) into event channel.
 * Note the expanding buffer that is passed explicitly in order to not loose any events.
 */
export function createSequenceParserEventChannel(
  sequenceParserThread: ParseSequencesStreamingThread,
): EventChannel<SequenceParserChannelElement> {
  return eventChannel((emit) => {
    function onSequence(seq: ParseSeqResult) {
      emit({ seq })
    }

    function onError(error: Error) {
      emit({ error })
    }

    function onComplete() {
      emit({ isDone: true })
    }

    const subscription = sequenceParserThread.values().subscribe(onSequence, onError, onComplete)

    return function unsubscribe() {
      subscription.unsubscribe()
    }
  }, buffers.expanding(1))
}

/**
 *
 * @param sequenceParserEventChannel
 * @param poolAnalyze
 */
export function* runAnalysisLoop(
  sequenceParserEventChannel: EventChannel<SequenceParserChannelElement>,
  poolAnalyze: Pool<AnalysisThread>,
) {
  const nextcladeResults: NextcladeWasmResult[] = []
  try {
    while (true) {
      // Take an event from the channel
      const { seq, error, isDone } = yield* take(sequenceParserEventChannel)

      if (isDone) {
        break
      }

      if (error) {
        console.error(error) // TODO: handle this sequence parsing error properly
        continue
      }

      if (seq) {
        // Queue the received sequence for the analysis in the worker pool
        console.log({ seq })
        void poolAnalyze.queue((worker) => {
          return worker.analyze(seq).then((nextcladeResult) => {
            console.log({ nextcladeResult })
            nextcladeResults.push(nextcladeResult)
          })
        })
      }
    }
  } finally {
    sequenceParserEventChannel.close()
  }
  return nextcladeResults
}

/**
 * Runs sequence parsing and analysis step for each sequence.
 * Uses sequence parser event channel to watch for parser events. Event contain parsed sequences.
 * Upon arrival of such an event, queues the sequence for the analysis in the webworker pool.
 */
export function* runSequenceAnalysis(params: NextcladeWasmParams) {
  // Create sequence parser thread
  const sequenceParserThread = yield* call(createThreadParseSequencesStreaming)

  // Create a channel which will emit the sequence parsing results
  const sequenceParserEventChannel = createSequenceParserEventChannel(sequenceParserThread)

  // Spawn the pool of analysis webworkers
  const poolAnalyze = Pool<AnalysisThread>(
    () => spawn<AnalysisWorker>(new Worker('src/workers/worker.analyze.ts', { name: 'worker.analyze' })),
    {
      size: numThreads,
      concurrency: 1,
      name: 'wasm',
      maxQueuedJobs: undefined,
    },
  )

  // Initialize each webworker in the pool.
  // This instantiates and initializes webassembly module. And runs the constructor of the underlying C++ class.
  yield* call(async () =>
    concurrent.forEach(
      async () => poolAnalyze.queue(async (worker: AnalysisThread) => worker.init(params)),
      Array.from({ length: numThreads }, () => undefined),
    ),
  )

  // Wait until pool is done initializing
  yield* apply(poolAnalyze, poolAnalyze.settled, [true])

  // This launches two main loops: analysis and parsing
  const { nextcladeResults } = yield* all({
    // Launch sequence parser loop and wait until it finishes parsing the input string
    unusedResult: apply(sequenceParserThread, sequenceParserThread.parseSequencesStreaming, [queryStr]),

    // Launch analysis loop
    nextcladeResults: call(runAnalysisLoop, sequenceParserEventChannel, poolAnalyze),
  })
  // When `all()` effect resolves, we know that parsing is done.
  // However, the analysis is still running on the remaining queued sequences and the results array is still being filled.

  // Wait until pool has processed all the queued sequences
  yield* apply(poolAnalyze, poolAnalyze.settled, [true])

  // Destroy the webworkers in the pool.
  // This calls the destructor of the underlying C++ class
  yield* call(async () =>
    concurrent.forEach(
      async () => poolAnalyze.queue(async (worker: AnalysisThread) => worker.destroy()),
      Array.from({ length: numThreads }, () => undefined),
    ),
  )

  // Terminate the webworker pool
  yield* apply(poolAnalyze, poolAnalyze.terminate, [true])

  return nextcladeResults
}

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

  const nextcladeResults = yield* runSequenceAnalysis({
    refStr,
    geneMapStr,
    geneMapName,
    treePreparedStr,
    pcrPrimersStr,
    pcrPrimersFilename,
    qcConfigStr,
  })

  const analysisResults = nextcladeResults.map((nextcladeResult) => nextcladeResult.analysisResult)
  const analysisResultsStr = JSON.stringify(analysisResults)

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
