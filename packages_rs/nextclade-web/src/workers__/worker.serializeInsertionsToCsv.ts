import 'regenerator-runtime'

import { expose } from 'threads/worker'

import { loadWasmModule, runWasmModule, WasmModule } from 'src/workers/wasmModule'

export interface SerializeInsertionsToCsvWasmModule extends WasmModule {
  serializeInsertionsToCsv(analysisResultsStr: string): string
}

export async function serializeInsertionsToCsv(analysisResultsStr: string) {
  const module = await loadWasmModule<SerializeInsertionsToCsvWasmModule>('nextclade_wasm')
  return runWasmModule<SerializeInsertionsToCsvWasmModule, string>(module, (module) => {
    return module.serializeInsertionsToCsv(analysisResultsStr)
  })
}

const serializeInsertionsToCsvWorker = { serializeInsertionsToCsv }
export type SerializeInsertionsToCsvWorker = typeof serializeInsertionsToCsvWorker
export type SerializeInsertionsToCsvThread = SerializeInsertionsToCsvWorker

expose(serializeInsertionsToCsvWorker)
