import 'regenerator-runtime'

import { expose } from 'threads/worker'

import { loadWasmModule, runWasmModule, WasmModule } from 'src/workers/wasmModule'

export interface ParseVirusJsonWasmModule extends WasmModule {
  parseVirusJsonString(virusJsonStr: string): string
}

export async function parseVirusJsonString(virusJsonStr: string) {
  const module = await loadWasmModule<ParseVirusJsonWasmModule>('nextclade_wasm')
  return runWasmModule<ParseVirusJsonWasmModule, string>(module, (module) => module.parseVirusJsonString(virusJsonStr))
}

const worker = { parseVirusJsonString }
export type ParseVirusJsonWorker = typeof worker
export type ParseVirusJsonThread = ParseVirusJsonWorker

expose(worker)
