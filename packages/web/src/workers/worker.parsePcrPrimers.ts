import 'regenerator-runtime'

import { expose } from 'threads/worker'

import { loadWasmModule, runWasmModule } from 'src/workers/wasmModule'

export interface ParsePcrPrimersWasmModule {
  parsePcrPrimersCsvString(pcrPrimersStrRaw: string, pcrPrimersFilename: string, refStr: string): string
}

export async function parsePcrPrimersCsvString(pcrPrimersStrRaw: string, pcrPrimersFilename: string, refStr: string) {
  const module = await loadWasmModule<ParsePcrPrimersWasmModule>('nextclade_wasm')
  return runWasmModule<ParsePcrPrimersWasmModule, string>(module, (module) =>
    module.parsePcrPrimersCsvString(pcrPrimersStrRaw, pcrPrimersFilename, refStr),
  )
}

const worker = { parsePcrPrimersCsvString }
export type ParseQcConfigWorker = typeof worker
export type ParsePcrPrimersThread = ParseQcConfigWorker

expose(worker)
