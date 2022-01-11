import { Pool, spawn as spawnBase, Worker } from 'threads'
import { concurrent } from 'fasy'

import type { SequenceParserResult } from 'src/algorithms/types'

import type { AnalysisThread, AnalysisWorker, NextcladeWasmParams } from 'src/workers/worker.analyze'
import type { ParseGeneMapThread } from 'src/workers/worker.parseGeneMap'
import type { ParsePcrPrimerCsvRowsStrThread } from 'src/workers/worker.parsePcrPrimers'
import type { ParseQcConfigThread } from 'src/workers/worker.parseQcConfig'
import type { ParseTreeThread } from 'src/workers/worker.parseTree'
import type { ParseRefSequenceThread } from 'src/workers/worker.parseRefSeq'
import type { ParseSequencesStreamingThread } from 'src/workers/worker.parseSequencesStreaming'
import type { TreeFinalizeThread } from 'src/workers/worker.treeFinalize'
import type { TreePrepareThread } from 'src/workers/worker.treePrepare'
import type { SerializeToCsvThread } from 'src/workers/worker.serializeToCsv'
import type { SerializeInsertionsToCsvThread } from './worker.serializeInsertionsToCsv'

const WORKER_TIMEOUT_MS = 60 * 1000

/** Wraps `spawn()` from `threads` package to provide a custom initialization timeout interval */
export const spawn: typeof spawnBase = (worker: Worker) => {
  return spawnBase(worker, { timeout: WORKER_TIMEOUT_MS })
}

/**
 * Creates and initializes the analysis webworker pool.
 * Note: perhaps frivolously, but words "webworker" and "thread" are used interchangeably throughout the code.
 */
export async function createAnalysisThreadPool(
  params: NextcladeWasmParams,
  numThreads: number,
): Promise<Pool<AnalysisThread>> {
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
  // This instantiates and initializes webassembly module, and runs the constructor of the underlying C++ class.
  await concurrent.forEach(async (poolWorkerPromise: { init: Promise<AnalysisThread> }) => {
    const worker = await poolWorkerPromise.init
    return worker.init(params)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
  }, poolAnalyze.workers) // eslint-disable-line array-func/no-unnecessary-this-arg

  // Wait until pool is done initializing
  await poolAnalyze.settled(true)

  return poolAnalyze
}

/**
 * Destroys the analysis webworker pool.
 * Note: perhaps frivolously, but words "webworker" and "thread" are used interchangeably throughout the code.
 */
export async function destroyAnalysisThreadPool(poolAnalyze: Pool<AnalysisThread>): Promise<void> {
  // Wait until pool has processed all the remaining queued sequences.
  await poolAnalyze.settled(true)

  // Destroy the webworkers in the pool. This calls the destructor of the underlying C++ class.
  await concurrent.forEach(async (poolWorkerPromise: { init: Promise<AnalysisThread> }) => {
    const worker = await poolWorkerPromise.init
    return worker.destroy()
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
  }, poolAnalyze.workers) // eslint-disable-line array-func/no-unnecessary-this-arg

  // Terminate the analysis worker pool
  await poolAnalyze.terminate(true)
}

export async function createThreadParseSequencesStreaming() {
  return spawn<ParseSequencesStreamingThread>(
    new Worker('src/workers/worker.parseSequencesStreaming.ts', { name: 'worker.parseSequencesStreaming' }),
  )
}

export async function parseSequencesStreaming(
  fastaStr: string,
  fastaName: string,
  onSequence: (seq: SequenceParserResult) => void,
  onError: (error: Error) => void,
  onComplete: () => void,
) {
  const thread = await createThreadParseSequencesStreaming()
  const subscription = thread.values().subscribe(onSequence, onError, onComplete)
  await thread.parseSequencesStreaming(fastaStr, fastaName)
  await subscription.unsubscribe() // eslint-disable-line @typescript-eslint/await-thenable
}

export async function parseRefSequence(refFastaStr: string, refFastaName: string) {
  const thread = await spawn<ParseRefSequenceThread>(
    new Worker('src/workers/worker.parseRefSeq.ts', { name: 'worker.parseRefSeq' }),
  )
  const refParsed: SequenceParserResult = await thread.parseRefSequence(refFastaStr, refFastaName)
  return { refStr: refParsed.seq, refName: refFastaName }
}

export async function parseGeneMapGffString(geneMapStrRaw: string, geneMapName: string) {
  const thread = await spawn<ParseGeneMapThread>(
    new Worker('src/workers/worker.parseGeneMap.ts', { name: 'worker.parseGeneMap' }),
  )
  return thread.parseGeneMapGffString(geneMapStrRaw, geneMapName)
}

export async function parseQcConfigString(qcConfigStr: string) {
  const thread = await spawn<ParseQcConfigThread>(
    new Worker('src/workers/worker.parseQcConfig.ts', { name: 'worker.parseQcConfig' }),
  )
  return thread.parseQcConfigString(qcConfigStr)
}

export async function parsePcrPrimerCsvRowsStr(pcrPrimersStrRaw: string, pcrPrimersFilename: string) {
  const thread = await spawn<ParsePcrPrimerCsvRowsStrThread>(
    new Worker('src/workers/worker.parsePcrPrimers.ts', { name: 'worker.parsePcrPrimers' }),
  )
  return thread.parsePcrPrimerCsvRowsStr(pcrPrimersStrRaw, pcrPrimersFilename)
}

export async function parseTree(treeStr: string) {
  const thread = await spawn<ParseTreeThread>(
    new Worker('src/workers/worker.parseTree.ts', { name: 'worker.parseTree' }),
  )
  return thread.parseTree(treeStr)
}

export async function treePrepare(treeStr: string, refStr: string) {
  const thread = await spawn<TreePrepareThread>(
    new Worker('src/workers/worker.treePrepare.ts', { name: 'worker.treePrepare' }),
  )
  return thread.treePrepare(treeStr, refStr)
}

export async function treeFinalize(treePreparedStr: string, refStr: string, analysisResultsStr: string) {
  const thread = await spawn<TreeFinalizeThread>(
    new Worker('src/workers/worker.treeFinalize.ts', { name: 'worker.treeFinalize' }),
  )
  return thread.treeFinalize(treePreparedStr, refStr, analysisResultsStr)
}

export async function serializeToCsv(analysisResultsStr: string, delimiter: string) {
  const thread = await spawn<SerializeToCsvThread>(
    new Worker('src/workers/worker.serializeToCsv.ts', { name: 'worker.serializeToCsv' }),
  )
  return thread.serializeToCsv(analysisResultsStr, delimiter)
}

export async function serializeInsertionsToCsv(analysisResultsStr: string) {
  const thread = await spawn<SerializeInsertionsToCsvThread>(
    new Worker('src/workers/worker.serializeInsertionsToCsv.ts', { name: 'worker.serializeInsertionsToCsv' }),
  )
  return thread.serializeInsertionsToCsv(analysisResultsStr)
}
