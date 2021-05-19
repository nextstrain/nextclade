/* eslint-disable no-loops/no-loops,no-continue,array-func/no-unnecessary-this-arg,no-void */
import type { EventChannel } from 'redux-saga'
import type { PoolEvent } from 'threads/dist/master/pool'
import { concurrent } from 'fasy'
import { Pool, spawn, Worker } from 'threads'
import { eventChannel, buffers } from 'redux-saga'
import { call, put, takeEvery, apply, take, all, fork, join } from 'typed-redux-saga'

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
 * Creates parser event channel. This channel is used for communication between parser and analysis loops.
 * Subscribes to observable stream from sequence parser webworker and queues the incoming parsed sequences
 * into the event channel. Later in the code, taking events from this channel yields parsed sequences.
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

export interface AnalysisChannelElement {
  nextcladeResult?: NextcladeWasmResult
  error?: Error
  started?: boolean
  cancelled?: boolean
  isDone?: boolean
}

/**
 * Creates analysis event channel. This channel is used for communication between analysis and results retrieval loops.
 * Subscribes to observable stream of the analysis worker pool and queues the incoming results of the analysis
 * into the event channel.
 */
export function createAnalysisEventChannel(poolAnalyze: Pool<AnalysisThread>): EventChannel<AnalysisChannelElement> {
  const events = poolAnalyze.events()

  return eventChannel((emit) => {
    function onNext(event: PoolEvent<AnalysisThread>) {
      switch (event.type) {
        case Pool.EventType.taskStart: {
          // Analysis of one of the sequences has started
          emit({ started: true })
          break
        }

        case Pool.EventType.taskCompleted: {
          const nextcladeResult = event.returnValue as NextcladeWasmResult
          emit({ nextcladeResult })
          break
        }

        case Pool.EventType.taskFailed: {
          // Analysis of one of the sequences failed, report error
          emit({ error: event.error })
          break
        }

        case Pool.EventType.taskCanceled: {
          // Analysis of one of the sequences has been cancelled
          emit({ cancelled: true })
          break
        }

        case Pool.EventType.terminated: {
          // Pool has been terminated, there will be no more results
          emit({ isDone: true })
          break
        }

        default:
          break
      }
    }

    function onError(error: Error) {
      emit({ error })
    }

    const subscription = events.subscribe(onNext, onError)

    return function unsubscribe() {
      subscription.unsubscribe()
    }
  }, buffers.expanding(10))
}

/**
 * Submits FASTA string for parsing in the parser thread. The actual looping is done in C++.
 * Thread emits results via an Observable. Parser channel subscribes to these events
 * (see `createSequenceParserEventChannel()`).
 */
export function* runParserLoop(sequenceParserThread: ParseSequencesStreamingThread, queryStr: string) {
  yield* apply(sequenceParserThread, sequenceParserThread.parseSequencesStreaming, [queryStr])
}

/**
 * Repeatedly retrieves parsed sequences from the event channel and queues each of them on the analysis worker pool.
 * Pool emits results via an Observable. Analysis channel subscribes to these events
 * (see `createAnalysisEventChannel()`).
 */
export function* runAnalysisLoop(
  sequenceParserEventChannel: EventChannel<SequenceParserChannelElement>,
  poolAnalyze: Pool<AnalysisThread>,
) {
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
        // Queue the received sequence for the analysis in the worker pool.
        // This returns immediately and the analysis result will be emitted into the analysis event channel.
        console.log({ seq })
        void poolAnalyze.queue((worker) => worker.analyze(seq))
      }
    }
  } finally {
    sequenceParserEventChannel.close()
  }
}

/**
 * Repeatedly retrieves the results of the analysis from the analysis event channel
 * and emits corresponding redux actions
 */
export function* runResultsLoop(analysisEventChannel: EventChannel<AnalysisChannelElement>) {
  const nextcladeResults: NextcladeWasmResult[] = []

  try {
    while (true) {
      const { nextcladeResult, error, started, cancelled, isDone } = yield* take(analysisEventChannel)

      if (isDone) {
        break
      }

      if (started) {
        continue
      }

      if (cancelled) {
        continue
      }

      if (error) {
        console.error(error) // TODO: handle this sequence parsing error properly
        continue
      }

      if (nextcladeResult) {
        console.log({ nextcladeResult })
        nextcladeResults.push(nextcladeResult)
      }
    }
  } finally {
    analysisEventChannel.close()
  }

  return nextcladeResults
}

/**
 * Runs sequence *parsing*, *analysis* and *results retrieval* loops.
 *
 * Each loops acts as a producer/consumer (or both) in a 3-stage multiple-producer-multiple-consumer pipeline.
 * Communication between loops is done using redux-saga event channels, which act as queues, buffering
 * produced items before a consumer is available to consume them.
 *
 * Parsing and analysis loops are parallel and rely on WebWorkers and WebAssembly. Results retrieval is a synchronous
 * saga (generator function)
 *
 *
 * Description of each loop:
 *
 *  - Loop 1: sequence parsing: independent.
 *     Consumes: input sequence string (from FASTA file or string containing multiple sequences) from parameters
 *     Produces: parsed sequences into sequence parser event channel
 *     Function: submits input string for parsing in parser webworker and emits resulting single parsed sequences
 *     into parser event channel
 *
 *  - Loop 2: sequence analysis: depends on parsing loop (Loop 1).
 *      Consumes: parsed sequences from sequence parser event channel
 *      Produces: analysis results into analysis event channel
 *      Function: takes parsed sequences from sequence parser event channel and queues them for analysis in the analysis
 *      webworker pool. Results are emitted by the pool via an observable and then reemitted into the analysis results
 *      event channel.
 *
 *  - Loop 3: results retrieval: depends on analysis loop (Loop 2).
 *    Consumes: analysis results from analysis event channel
 *    Produces: redux actions per result and a separate array of all results
 *    Function: Retrieves analysis results from analysis event channel and emits redux actions, which merge results
 *    into the app state (and changes to state trigger rerendering of React components). Also produces an array of all
 *    results for subsequent processing.
 *
 * Schema of the pipeline:
 *                                                           Analysis thread pool
 *                                                         /-> [Analysis thread] -\
 * Input FASTA -> [Parsing thread] -> Parser event channel --> [Analysis thread] --> Analysis event channel -> [Results retrieval] -> Redux actions -> Redux reducer -> Application state -> React components rerendering
 *           (parallel, webworker, wasm)                   \-> [Analysis thread] -/                             (synchronous, JS)
 *                                                     (parallel, webworker pool, wasm)
 */
export function* runSequenceAnalysis(params: NextcladeWasmParams) {
  // Create sequence parser thread
  const sequenceParserThread = yield* call(createThreadParseSequencesStreaming)

  // Create a channel which will buffer parsed sequences
  const sequenceParserEventChannel = createSequenceParserEventChannel(sequenceParserThread)

  // Spawn the pool of analysis webworkers
  const poolAnalyze = Pool<AnalysisThread>(
    () => spawn<AnalysisWorker>(new Worker('src/workers/worker.analyze.ts', { name: 'worker.analyze' })),
    {
      size: numThreads,
      concurrency: 1,
      name: 'pool.analyze',
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

  // Create channel which will buffer the analysis results
  const analysisEventChannel = createAnalysisEventChannel(poolAnalyze)

  // Loop 3: Launch results retrieval loop. This loop retrieves analysis results from analysis event channel and
  // submit redux actions to trigger redux reducer, which incorporates results into the application state.
  // The `fork()` effect is used to make sure that we don't wait on this loop before parsing and analysis is complete.
  const resultsTask = yield* fork(runResultsLoop, analysisEventChannel)

  // The `call-all` schema is used here, because we want parsing and scheduling for analysis to run in parallel
  // (ideally concurrently). Note that when parser loop ends, the parsing is known to be done, however when analysis
  // loop is done it only means that all sequences are scheduled for analysis. The analysis itself keeps running.
  yield* all([
    // Loop 2: Launch analysis loop
    call(runAnalysisLoop, sequenceParserEventChannel, poolAnalyze),

    // Loop 1: Launch sequence parser loop and wait until it finishes parsing the input string.
    call(runParserLoop, sequenceParserThread, queryStr),
  ])
  // When `all()` effect resolves, we know that parsing is done. However, the analysis loop is still running.

  // Wait until pool has processed all the queued sequences.
  yield* apply(poolAnalyze, poolAnalyze.settled, [true])
  // At this point we know that the analysis is done.

  // Destroy the webworkers in the pool. This calls the destructor of the underlying C++ class.
  yield* call(async () =>
    concurrent.forEach(
      async () => poolAnalyze.queue(async (worker: AnalysisThread) => worker.destroy()),
      Array.from({ length: numThreads }, () => undefined),
    ),
  )
  // Terminate the analysis worker pool. This signals to results retrieval loop that the analysis is done and there
  // will be no results after that.
  yield* apply(poolAnalyze, poolAnalyze.terminate, [true])

  // Returns array of results aggregated in the results retrieval loop
  return ((yield* join(resultsTask)) as unknown) as NextcladeWasmResult[]
}

/**
 * Runs Nextclade algorithm: parsing, analysis, and tree placement
 */
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
