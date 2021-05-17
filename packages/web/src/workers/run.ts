import { spawn, Worker } from 'threads'

import type { ParseSeqResult } from 'src/workers/types'
import type { ParseSequencesStreamingThread } from 'src/workers/worker.parseSequencesStreaming'
import type { ParseRefSequenceThread } from 'src/workers/worker.parseRefSeq'
import type { ParseGeneMapThread } from 'src/workers/worker.parseGeneMap'
import type { ParseQcConfigThread } from 'src/workers/worker.parseQcConfig'
import type { ParsePcrPrimersThread } from 'src/workers/worker.parsePcrPrimers'
import type { TreePrepareThread } from 'src/workers/worker.treePrepare'
import type { TreeFinalizeThread } from 'src/workers/worker.treeFinalize'

export async function parseSequencesStreaming(
  fastaStr: string,
  onSequence: (seq: ParseSeqResult) => void,
  onError: (error: Error) => void,
  onComplete: () => void,
) {
  const thread = await spawn<ParseSequencesStreamingThread>(
    new Worker('src/workers/worker.parseSequencesStreaming.ts', { name: 'worker.parseSequencesStreaming' }),
  )
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
