import 'regenerator-runtime'

import { expose } from 'threads/worker'
import { Observable as ThreadsObservable, Subject } from 'threads/observable'

import type { SequenceParserResult } from 'src/algorithms/types'
import { loadWasmModule, runWasmModule } from 'src/workers/wasmModule'

const gSubject = new Subject<SequenceParserResult>()

function onSequence(seq: SequenceParserResult) {
  gSubject?.next(seq)
}

function onComplete() {
  gSubject?.complete()
}

function onError(error: Error) {
  gSubject?.error(error)
}

export interface ParseSequencesStreamingWasmModule {
  parseSequencesStreaming(fastaStr: string, onSequence: (seq: SequenceParserResult) => void, onComplete: () => void): void
}

export async function parseSequencesStreaming(fastaStr: string) {
  const module = await loadWasmModule<ParseSequencesStreamingWasmModule>('nextclade_wasm')
  return runWasmModule<ParseSequencesStreamingWasmModule, void>(module, (module) => {
    try {
      module.parseSequencesStreaming(fastaStr, onSequence, onComplete)
    } catch (error) {
      onError(error)
    }
  })
}

const worker = {
  parseSequencesStreaming,
  values(): ThreadsObservable<SequenceParserResult> {
    return ThreadsObservable.from(gSubject)
  },
}

export type ParseSequencesStreamingWorker = typeof worker
export type ParseSequencesStreamingThread = ParseSequencesStreamingWorker
export type { ThreadsObservable }

expose(worker)
