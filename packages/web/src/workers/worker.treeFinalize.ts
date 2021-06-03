import 'regenerator-runtime'

import { expose } from 'threads/worker'

import { loadWasmModule, runWasmModule, WasmModule } from 'src/workers/wasmModule'

export interface TreeFinalizeSequencesWasmModule extends WasmModule {
  treeFinalize(treeStr: string, refFastaStr: string, analysisResultsStr: string): string
}

export async function treeFinalize(treeStr: string, refFastaStr: string, analysisResultsStr: string): Promise<string> {
  const module = await loadWasmModule<TreeFinalizeSequencesWasmModule>('nextclade_wasm')
  return runWasmModule<TreeFinalizeSequencesWasmModule, string>(module, (module) => {
    return module.treeFinalize(treeStr, refFastaStr, analysisResultsStr)
  })
}

const treeFinalizeWorker = { treeFinalize }
export type TreeFinalizeWorker = typeof treeFinalizeWorker
export type TreeFinalizeThread = TreeFinalizeWorker

expose(treeFinalizeWorker)
