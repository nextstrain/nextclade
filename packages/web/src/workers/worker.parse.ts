import 'regenerator-runtime'

import { expose } from 'threads/worker'
import { Observable, Subject } from 'threads/observable'

import { loadWasmModule, runWasmModule } from 'src/workers/wasmModule'

let subject = new Subject<unknown>()

export interface ParseSequencesWasmModule {
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

  function onSequence(seq: unknown) {
    subject?.next(seq)
  }

  function onComplete() {
    subject?.complete()
  }

  return runWasmModule(module, (module) => {
    try {
      module.parseSequencesStreaming(fastaStr, onSequence, onComplete)
    } catch (error) {
      subject?.error(error)
    }
  })
}

const worker = {
  init,
  run,
  values(): Observable<unknown> {
    return Observable.from(subject)
  },
}

export type ParseWorker = typeof worker
export type ParseThread = ParseWorker
export type { Observable }

expose(worker)
