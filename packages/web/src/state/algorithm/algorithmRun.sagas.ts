/* eslint-disable no-loops/no-loops,no-continue,no-void */
import type { EventChannel } from 'redux-saga'
import { buffers, eventChannel } from 'redux-saga'
import type { PoolEvent } from 'threads/dist/master/pool'
import { Pool } from 'threads'
import { all, apply, call, fork, join, put, select, take, takeEvery } from 'typed-redux-saga'
import { push } from 'connected-next-router/actions'

import type { AuspiceJsonV2 } from 'auspice'
import { changeColorBy } from 'auspice/src/actions/colors'

import { axiosFetchRaw } from 'src/io/axiosFetch'
import { createAuspiceState } from 'src/state/auspice/createAuspiceState'
import { auspiceStartClean, treeFilterByNodeType } from 'src/state/auspice/auspice.actions'
import fsaSaga from 'src/state/util/fsaSaga'

import type { AnalysisThread, NextcladeResult, NextcladeWasmParams } from 'src/workers/worker.analyze'
import type { ParseSequencesStreamingThread } from 'src/workers/worker.parseSequencesStreaming'
import type { DatasetFlat, SequenceParserResult } from 'src/algorithms/types'
import {
  addNextcladeResult,
  addParsedSequence,
  algorithmRunAsync,
  setAlgorithmGlobalStatus,
  setFasta,
  setGeneMapObject,
  setGenomeSize,
  setTreeResult,
} from 'src/state/algorithm/algorithm.actions'
import { AlgorithmGlobalStatus, AlgorithmInput } from 'src/state/algorithm/algorithm.state'
import {
  selectCurrentDataset,
  selectGeneMapStr,
  selectPcrPrimersStr,
  selectQcConfigStr,
  selectQueryName,
  selectQueryStr,
  selectRefName,
  selectRefSeq,
  selectRefTreeStr,
} from 'src/state/algorithm/algorithm.selectors'
import { resetViewedGene } from 'src/state/ui/ui.actions'
import {
  createAnalysisThreadPool,
  createThreadParseSequencesStreaming,
  destroyAnalysisThreadPool,
  treeFinalize,
  treePrepare,
} from 'src/workers/run'
import {
  loadFasta,
  loadGeneMap,
  loadPcrPrimers,
  loadQcSettings,
  loadRootSeq,
  loadTree,
} from 'src/state/algorithm/algorithmInputs.sagas'
import { AlgorithmInputString } from 'src/io/AlgorithmInput'
import { selectNumThreads } from 'src/state/settings/settings.selectors'
import { prepareGeneMap } from 'src/io/prepareGeneMap'
import { errorAdd } from 'src/state/error/error.actions'
import { sanitizeError } from 'src/helpers/sanitizeError'
import { serializeResults } from 'src/io/serializeResults'

export interface SequenceParserChannelElement {
  seq?: SequenceParserResult
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
    function onSequence(seq: SequenceParserResult) {
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
  nextcladeResult?: NextcladeResult
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
          const nextcladeResult = event.returnValue as NextcladeResult
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
export function* runParserLoop(
  sequenceParserThread: ParseSequencesStreamingThread,
  queryStr: string,
  queryInputName: string,
) {
  yield* apply(sequenceParserThread, sequenceParserThread.parseSequencesStreaming, [queryStr, queryInputName])
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
        yield put(errorAdd({ error }))
        continue
      }

      if (seq) {
        // Queue the received sequence for the analysis in the worker pool.
        // This returns immediately and the analysis result will be emitted into the analysis event channel.
        void poolAnalyze.queue((worker) => worker.analyze(seq))
        yield* put(addParsedSequence({ index: seq.index, seqName: seq.seqName }))
      }
    }
  } catch (error_: unknown) {
    const error = sanitizeError(error_)
    yield put(errorAdd({ error }))
  } finally {
    sequenceParserEventChannel.close()
  }
}

/**
 * Repeatedly retrieves the results of the analysis from the analysis event channel
 * and emits corresponding redux actions
 */
export function* runResultsLoop(analysisEventChannel: EventChannel<AnalysisChannelElement>) {
  const nextcladeResults: NextcladeResult[] = []

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
        yield put(errorAdd({ error }))
        continue
      }

      if (nextcladeResult) {
        nextcladeResults.push(nextcladeResult)
        yield* put(addNextcladeResult({ nextcladeResult }))
      }
    }
  } catch (error_: unknown) {
    const error = sanitizeError(error_)
    yield put(errorAdd({ error }))
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
export function* runSequenceAnalysis(queryStr: string, queryInputName: string, params: NextcladeWasmParams) {
  yield* put(setAlgorithmGlobalStatus(AlgorithmGlobalStatus.initWorkers))
  // Create sequence parser thread
  const sequenceParserThread = yield* call(createThreadParseSequencesStreaming)

  // Create a channel which will buffer parsed sequences
  const sequenceParserEventChannel = createSequenceParserEventChannel(sequenceParserThread)

  // Create analysis thread pool
  const numThreads = yield* select(selectNumThreads)
  const poolAnalyze = yield* call(createAnalysisThreadPool, params, numThreads)

  // Create channel which will buffer the analysis results
  const analysisEventChannel = createAnalysisEventChannel(poolAnalyze)

  // Loop 3: Launch results retrieval loop. This loop retrieves analysis results from analysis event channel and
  // submit redux actions to trigger redux reducer, which incorporates results into the application state.
  // The `fork()` effect is used to make sure that we don't wait on this loop before parsing and analysis is complete.
  const resultsTask = yield* fork(runResultsLoop, analysisEventChannel)

  yield* put(setAlgorithmGlobalStatus(AlgorithmGlobalStatus.started))

  // The `call-all` schema is used here, because we want (1) parsing and (2) scheduling for analysis to run in parallel
  // (ideally concurrently). Note that when parser loop ends, the parsing is known to be done, however when analysis
  // loop is done it only means that all sequences are scheduled for analysis. The analysis itself keeps running.
  yield* all([
    // Loop 2: Launch analysis loop
    call(runAnalysisLoop, sequenceParserEventChannel, poolAnalyze),

    // Loop 1: Launch sequence parser loop and wait until it finishes parsing the input string.
    call(runParserLoop, sequenceParserThread, queryStr, queryInputName),
  ])
  // When `all()` effect resolves, we know that parsing is done. However, the analysis is still running.

  // Destroy analysis pool as it is no longer needed
  yield* call(destroyAnalysisThreadPool, poolAnalyze)

  // Return array of results aggregated in the results retrieval loop
  return ((yield* join(resultsTask)) as unknown) as NextcladeResult[]
}

export function* getRefSequence(dataset: DatasetFlat) {
  // Load ref sequence from current state, in case it was set by the user previously
  const refStr = yield* select(selectRefSeq)
  const refName = yield* select(selectRefName)

  if (refStr && refName) {
    return { refStr, refName }
  }

  const refFastaStr = yield* call(async () => axiosFetchRaw(dataset.files.reference))
  return yield* loadRootSeq(new AlgorithmInputString(refFastaStr, 'reference.fasta'))
}

export function* getGeneMap(dataset: DatasetFlat) {
  const geneMapStr = yield* select(selectGeneMapStr)
  if (geneMapStr) {
    return geneMapStr
  }
  const geneMapStrRaw = yield* call(async () => axiosFetchRaw(dataset.files.geneMap))
  return (yield* loadGeneMap(new AlgorithmInputString(geneMapStrRaw))).geneMapStr
}

export function* getTree(dataset: DatasetFlat) {
  const treeStr = yield* select(selectRefTreeStr)
  if (treeStr) {
    return treeStr
  }
  const treeStrRaw = yield* call(async () => axiosFetchRaw(dataset.files.tree))
  return (yield* loadTree(new AlgorithmInputString(treeStrRaw))).treeStr
}

export function* getPcrPrimers(dataset: DatasetFlat) {
  const pcrPrimersStr = yield* select(selectPcrPrimersStr)
  if (pcrPrimersStr) {
    return pcrPrimersStr
  }
  const pcrPrimersStrRaw = yield* call(async () => axiosFetchRaw(dataset.files.primers))
  return (yield* loadPcrPrimers(new AlgorithmInputString(pcrPrimersStrRaw))).pcrPrimerCsvRowsStr
}

export function* getQcConfig(dataset: DatasetFlat) {
  const qcConfigStr = yield* select(selectQcConfigStr)
  if (qcConfigStr) {
    return qcConfigStr
  }
  const qcConfigStrRaw = yield* call(async () => axiosFetchRaw(dataset.files.qc))
  return (yield* loadQcSettings(new AlgorithmInputString(qcConfigStrRaw))).qcConfigStr
}

export function* getQuerySequences(dataset: DatasetFlat, queryInput?: AlgorithmInput) {
  // If sequence data is provided explicitly, load it
  if (queryInput) {
    const loadSequences = fsaSaga(setFasta, loadFasta)
    yield* loadSequences(setFasta.trigger(queryInput))
  }

  // If not provided, maybe the previously used sequence data is of any good?
  let queryStr = yield* select(selectQueryStr)
  let queryName = yield* select(selectQueryName)
  if (queryStr && queryName) {
    return { queryStr, queryName }
  }

  queryStr = yield* call(async () => axiosFetchRaw(dataset.files.sequences))
  queryName = `${dataset.nameFriendly}, ${dataset.tag}`

  return { queryStr, queryName }
}

/**
 * Runs Nextclade algorithm: parsing, analysis, and tree placement
 */
export function* runAlgorithm(queryInput?: AlgorithmInput) {
  yield* put(setAlgorithmGlobalStatus(AlgorithmGlobalStatus.loadingData))
  yield* put(resetViewedGene())
  yield* put(push('/results'))

  const dataset = yield* select(selectCurrentDataset)
  if (!dataset) {
    throw new Error('No dataset is selected. Unable to proceed. This is an internal error and might indicate a bug.')
  }

  const {
    ref: { refStr, refName },
    query: { queryStr, queryName },
    geneMapStr,
    treeStr,
    pcrPrimerCsvRowsStr,
    qcConfigStr,
  } = yield* all({
    ref: getRefSequence(dataset),
    query: getQuerySequences(dataset, queryInput),
    geneMapStr: getGeneMap(dataset),
    treeStr: getTree(dataset),
    pcrPrimerCsvRowsStr: getPcrPrimers(dataset),
    qcConfigStr: getQcConfig(dataset),
  })

  const genomeSize = refStr.length
  yield* put(setGenomeSize({ genomeSize }))

  const geneMap = prepareGeneMap(geneMapStr)
  yield* put(setGeneMapObject({ geneMap }))

  const treePreparedStr = yield* call(treePrepare, treeStr, refStr)

  const geneMapName = ''
  const pcrPrimersFilename = ''
  const nextcladeResults = yield* runSequenceAnalysis(queryStr, queryName, {
    refStr,
    refName,
    geneMapStr,
    geneMapName,
    treePreparedStr,
    pcrPrimerCsvRowsStr,
    pcrPrimersFilename,
    qcConfigStr,
  })

  const analysisResults = nextcladeResults
    .filter((nextcladeResult) => !nextcladeResult.hasError)
    .map((nextcladeResult) => nextcladeResult.analysisResult)

  if (analysisResults.length > 0) {
    const analysisResultsStr = serializeResults(analysisResults)

    yield* put(setAlgorithmGlobalStatus(AlgorithmGlobalStatus.buildingTree))
    const treeFinalStr = yield* call(treeFinalize, treePreparedStr, refStr, analysisResultsStr)
    const tree = parseAuspiceJsonV2(treeFinalStr)

    yield* setAuspiceState(tree)
    yield* put(setTreeResult({ treeStr: treeFinalStr }))
  }

  yield* put(setAlgorithmGlobalStatus(AlgorithmGlobalStatus.done))
}

export function parseAuspiceJsonV2(treeStr: string): AuspiceJsonV2 {
  return JSON.parse(treeStr) as AuspiceJsonV2 // TODO: validate
}

export function* setAuspiceState(auspiceDataPostprocessed: AuspiceJsonV2) {
  const auspiceState = createAuspiceState(auspiceDataPostprocessed)
  yield* put(auspiceStartClean(auspiceState))
  yield* put(changeColorBy())
  yield* put(treeFilterByNodeType(['New']))
}

export default [takeEvery(algorithmRunAsync.trigger, fsaSaga(algorithmRunAsync, runAlgorithm))]
