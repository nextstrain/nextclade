import { Pool, spawn, Worker } from 'threads'
import { concurrent } from 'fasy'

import type { ParseSeqResult } from 'src/workers/types'
import type { ParseSequencesStreamingThread } from 'src/workers/worker.parseSequencesStreaming'
import type { ParseRefSequenceThread } from 'src/workers/worker.parseRefSeq'
import type { ParseGeneMapThread } from 'src/workers/worker.parseGeneMap'
import type { ParseQcConfigThread } from 'src/workers/worker.parseQcConfig'
import type { ParsePcrPrimersThread } from 'src/workers/worker.parsePcrPrimers'
import type { TreePrepareThread } from 'src/workers/worker.treePrepare'
import type { TreeFinalizeThread } from 'src/workers/worker.treeFinalize'
import { AnalysisThread, AnalysisWorker, NextcladeWasmParams } from 'src/workers/worker.analyze'

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
  // This instantiates and initializes webassembly module. And runs the constructor of the underlying C++ class.
  await concurrent.forEach(
    async () => poolAnalyze.queue(async (worker: AnalysisThread) => worker.init(params)),
    Array.from({ length: numThreads }, () => undefined), // eslint-disable-line array-func/no-unnecessary-this-arg
  )

  // Wait until pool is done initializing
  await poolAnalyze.settled(true)

  return poolAnalyze
}

/**
 * Destroys the analysis webworker pool.
 * Note: perhaps frivolously, but words "webworker" and "thread" are used interchangeably throughout the code.
 */
export async function destroyAnalysisThreadPool(poolAnalyze: Pool<AnalysisThread>, numThreads: number): Promise<void> {
  // Wait until pool has processed all the remaining queued sequences.
  await poolAnalyze.settled(true)

  // Destroy the webworkers in the pool. This calls the destructor of the underlying C++ class.
  await concurrent.forEach(
    async () => poolAnalyze.queue(async (worker: AnalysisThread) => worker.destroy()),
    Array.from({ length: numThreads }, () => undefined), // eslint-disable-line array-func/no-unnecessary-this-arg
  )

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
  onSequence: (seq: ParseSeqResult) => void,
  onError: (error: Error) => void,
  onComplete: () => void,
) {
  const thread = await createThreadParseSequencesStreaming()
  const subscription = thread.values().subscribe(onSequence, onError, onComplete)
  await thread.parseSequencesStreaming(fastaStr)
  await subscription.unsubscribe()
}

export async function parseRefSequence(refFastaStr: string) {
  const thread = await spawn<ParseRefSequenceThread>(
    new Worker('src/workers/worker.parseRefSeq.ts', { name: 'worker.parseRefSeq' }),
  )
  const refParsed: ParseSeqResult = await thread.parseRefSequence(refFastaStr)
  return refParsed.seq
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

export async function parsePcrPrimersCsvString(pcrPrimersStrRaw: string, pcrPrimersFilename: string, refStr: string) {
  const thread = await spawn<ParsePcrPrimersThread>(
    new Worker('src/workers/worker.parsePcrPrimers.ts', { name: 'worker.parsePcrPrimers' }),
  )
  return thread.parsePcrPrimersCsvString(pcrPrimersStrRaw, pcrPrimersFilename, refStr)
}

export async function treePrepare(treeStr: string, refStr: string) {
  const thread = await spawn<TreePrepareThread>(
    new Worker('src/workers/worker.treePrepare.ts', { name: 'worker.treePrepare' }),
  )
  return thread.treePrepare(treeStr, refStr)
}

export async function treeFinalize(treePreparedStr: string, refStr: string, analysisResultsStr: string) {
  const threadTreeFinalize = await spawn<TreeFinalizeThread>(
    new Worker('src/workers/worker.treeFinalize.ts', { name: 'worker.treeFinalize' }),
  )
  return threadTreeFinalize.treeFinalize(treePreparedStr, refStr, analysisResultsStr)
}
