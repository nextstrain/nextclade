import 'regenerator-runtime'

import { expose } from 'threads/worker'

import { loadWasmModule, runWasmModule, WasmModule } from 'src/workers/wasmModule'

export interface SerializeToCsvWasmModule extends WasmModule {
  serializeToCsv(analysisResultsStr: string, delimiter: string): string
}

export async function serializeToCsv(analysisResultsStr: string, delimiter: string) {
  const module = await loadWasmModule<SerializeToCsvWasmModule>('nextclade_wasm')
  return runWasmModule<SerializeToCsvWasmModule, string>(module, (module) => {
    return module.serializeToCsv(analysisResultsStr, delimiter)
  })
}

const serializeToCsvWorker = { serializeToCsv }
export type SerializeToCsvWorker = typeof serializeToCsvWorker
export type SerializeToCsvThread = SerializeToCsvWorker

expose(serializeToCsvWorker)
