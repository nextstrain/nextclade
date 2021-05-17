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

const worker = {
  parseRefSequence,
  parseSequencesStreaming,
  values(): ThreadsObservable<AlgorithmInput> {
    return ThreadsObservable.from(gSubject)
  },
}

export type ParseWorker = typeof worker
export type ParseThread = ParseWorker
export type { ThreadsObservable }

expose(worker)
