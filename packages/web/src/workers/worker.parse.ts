import 'regenerator-runtime'

import { expose } from 'threads/worker'
import { Observable as ThreadsObservable, Subject } from 'threads/observable'

import { loadWasmModule, runWasmModule } from 'src/workers/wasmModule'

export interface AlgorithmInput {
  index: number
  seqName: string
  seq: string
}

const gSubject = new Subject<AlgorithmInput>()

function onSequence(seq: AlgorithmInput) {
  gSubject?.next(seq)
}

function onComplete() {
  gSubject?.complete()
}

function onError(error: Error) {
  gSubject?.error(error)
}

export interface ParseSequencesWasmModule {
  parseRefSequence(fastaStr: string): AlgorithmInput

  parseGeneMapGffString(geneMapStr: string, geneMapName: string): string

  parseQcConfigString(qcConfigStr: string): string

  parsePcrPrimersCsvString(pcrPrimersStr: string, pcrPrimersFilename: string, refStr: string): string

  parseSequencesStreaming(fastaStr: string, onSequence: (seq: AlgorithmInput) => void, onComplete: () => void): void
}

export async function parseSequencesStreaming(fastaStr: string) {
  const module = await loadWasmModule<ParseSequencesWasmModule>('nextclade_wasm')
  return runWasmModule<ParseSequencesWasmModule, void>(module, (module) => {
    try {
      module.parseSequencesStreaming(fastaStr, onSequence, onComplete)
    } catch (error) {
      onError(error)
    }
  })
}

export async function parseRefSequence(refFastaStr: string) {
  const module = await loadWasmModule<ParseSequencesWasmModule>('nextclade_wasm')
  return runWasmModule<ParseSequencesWasmModule, AlgorithmInput>(module, (module) =>
    module.parseRefSequence(refFastaStr),
  )
}

export async function parseGeneMapGffString(geneMapStr: string, geneMapName: string) {
  const module = await loadWasmModule<ParseSequencesWasmModule>('nextclade_wasm')
  return runWasmModule<ParseSequencesWasmModule, string>(module, (module) =>
    module.parseGeneMapGffString(geneMapStr, geneMapName),
  )
}

export async function parseQcConfigString(qcConfigStr: string) {
  const module = await loadWasmModule<ParseSequencesWasmModule>('nextclade_wasm')
  return runWasmModule<ParseSequencesWasmModule, string>(module, (module) => module.parseQcConfigString(qcConfigStr))
}

export async function parsePcrPrimersCsvString(pcrPrimersStr: string, pcrPrimersFilename: string, refStr: string) {
  const module = await loadWasmModule<ParseSequencesWasmModule>('nextclade_wasm')
  return runWasmModule<ParseSequencesWasmModule, string>(module, (module) =>
    module.parsePcrPrimersCsvString(pcrPrimersStr, pcrPrimersFilename, refStr),
  )
}

const worker = {
  parseRefSequence,
  parseSequencesStreaming,
  parseGeneMapGffString,
  parseQcConfigString,
  parsePcrPrimersCsvString,
  values(): ThreadsObservable<AlgorithmInput> {
    return ThreadsObservable.from(gSubject)
  },
}

export type ParseWorker = typeof worker
export type ParseThread = ParseWorker
export type { ThreadsObservable }

expose(worker)
