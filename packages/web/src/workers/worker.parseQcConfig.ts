import 'regenerator-runtime'

import { expose } from 'threads/worker'

import { loadWasmModule, runWasmModule, WasmModule } from 'src/workers/wasmModule'

export interface ParseQcConfigWasmModule extends WasmModule {
  parseQcConfigString(qcConfigStr: string): string
}

export async function parseQcConfigString(qcConfigStr: string) {
  const module = await loadWasmModule<ParseQcConfigWasmModule>('nextclade_wasm')
  return runWasmModule<ParseQcConfigWasmModule, string>(module, (module) => module.parseQcConfigString(qcConfigStr))
}

const worker = { parseQcConfigString }
export type ParseQcConfigWorker = typeof worker
export type ParseQcConfigThread = ParseQcConfigWorker

expose(worker)
