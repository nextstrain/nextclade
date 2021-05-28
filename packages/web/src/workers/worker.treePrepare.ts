import 'regenerator-runtime'

import { expose } from 'threads/worker'

import { loadWasmModule, runWasmModule } from 'src/workers/wasmModule'

export interface TreePrepareWasmModule {
  treePrepare(treeStr: string, refStr: string): string
}

export async function treePrepare(treeStr: string, refStr: string) {
  const module = await loadWasmModule<TreePrepareThread>('nextclade_wasm')
  return runWasmModule<TreePrepareWasmModule, string>(module, (module) => {
    return module.treePrepare(treeStr, refStr)
  })
}

const treePrepareWorker = { treePrepare }
export type TreePrepareWorker = typeof treePrepareWorker
export type TreePrepareThread = TreePrepareWorker

expose(treePrepareWorker)
