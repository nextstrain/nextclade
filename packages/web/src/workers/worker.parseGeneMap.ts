import 'regenerator-runtime'

import { expose } from 'threads/worker'
import { loadWasmModule, runWasmModule } from 'src/workers/wasmModule'

export interface ParseGenMapWasmModule {
  parseGeneMapGffString(geneMapStr: string, geneMapName: string): string
}

export async function parseGeneMapGffString(geneMapStr: string, geneMapName: string) {
  const module = await loadWasmModule<ParseGenMapWasmModule>('nextclade_wasm')
  return runWasmModule<ParseGenMapWasmModule, string>(module, (module) =>
    module.parseGeneMapGffString(geneMapStr, geneMapName),
  )
}

const worker = { parseGeneMapGffString }

export type ParseGeneMapWorker = typeof worker
export type ParseGeneMapThread = ParseGeneMapWorker

expose(worker)
