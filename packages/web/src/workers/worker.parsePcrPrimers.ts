import 'regenerator-runtime'

import { expose } from 'threads/worker'

import { loadWasmModule, runWasmModule } from 'src/workers/wasmModule'

export interface parsePcrPrimerCsvRowsStrWasmModule {
  parsePcrPrimerCsvRowsStr(pcrPrimersCsvRowsStrRaw: string, pcrPrimersFilename: string): string
}

export async function parsePcrPrimerCsvRowsStr(pcrPrimersStrRaw: string, pcrPrimersFilename: string) {
  const module = await loadWasmModule<parsePcrPrimerCsvRowsStrWasmModule>('nextclade_wasm')
  return runWasmModule<parsePcrPrimerCsvRowsStrWasmModule, string>(module, (module) =>
    module.parsePcrPrimerCsvRowsStr(pcrPrimersStrRaw, pcrPrimersFilename),
  )
}

const worker = { parsePcrPrimerCsvRowsStr }
export type ParsePcrPrimerCsvRowsStrWorker = typeof worker
export type ParsePcrPrimerCsvRowsStrThread = ParsePcrPrimerCsvRowsStrWorker

expose(worker)
