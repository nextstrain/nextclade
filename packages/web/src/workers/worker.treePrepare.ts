import 'regenerator-runtime'

import { expose } from 'threads/worker'

import { loadWasmModule, runWasmModule } from 'src/workers/wasmModule'

export interface TreePrepareSequencesWasmModule {
  treePrepare(treeStr: string, refFastaStr: string): string
}

export async function treePrepare(treeStr: string, refFastaStr: string) {
  const module = await loadWasmModule<TreePrepareSequencesWasmModule>('nextclade_wasm')
  return runWasmModule<TreePrepareSequencesWasmModule, string>(module, (module) => {
    return module.treePrepare(treeStr, refFastaStr)
  })
}

const treePrepareWorker = { treePrepare }
export type TreePrepareWorker = typeof treePrepareWorker
export type TreePrepareThread = TreePrepareWorker

expose(treePrepareWorker)
