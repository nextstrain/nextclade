import 'regenerator-runtime'

import { expose } from 'threads/worker'
import { Observable, Subject } from 'threads/observable'

import { loadWasmModule, runWasmModule } from 'src/workers/wasmModule'

export interface AlgorithmInput {
  index: number
  seqName: string
  seq: string
}

let subject = new Subject<AlgorithmInput>()

function onSequence(seq: AlgorithmInput) {
  subject?.next(seq)
}

function onComplete() {
  subject?.complete()
}

function onError(error: Error) {
  subject?.error(error)
}

export interface ParseSequencesWasmModule {
  parseRefSequence(fastaStr: string): AlgorithmInput

  parseSequencesStreaming(fastaStr: string, onSequence: (seq: unknown) => void, onComplete: () => void): void
}

let module: ParseSequencesWasmModule | undefined

export async function init() {
  try {
    module = await loadWasmModule('nextclade_wasm')
    subject = new Subject()
  } catch (error) {
    console.error(error)
  }
}

export function run(fastaStr: string) {
  if (!module) {
    throw new Error(
      'Developer error: this WebAssembly module has not been initialized yet. Make sure to call `module.init()` function before `module.run()`',
    )
  }

  return runWasmModule(module, (module) => {
    try {
      module.parseSequencesStreaming(fastaStr, onSequence, onComplete)
    } catch (error) {
      onError(error)
    }
  })
}

export function parseRefSequence(refFastaStr: string) {
  if (!module) {
    throw new Error(
      'Developer error: this WebAssembly module has not been initialized yet. Make sure to call `module.init()` function before `module.run()`',
    )
  }

  return runWasmModule(module, (module) => module.parseRefSequence(refFastaStr))
}

const worker = {
  init,
  parseRefSequence,
  run,
  values(): Observable<AlgorithmInput> {
    return Observable.from(subject)
  },
}

export type ParseWorker = typeof worker
export type ParseThread = ParseWorker
export type { Observable }

expose(worker)
