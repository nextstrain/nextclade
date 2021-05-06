import 'regenerator-runtime'

import { expose } from 'threads/worker'

import { loadWasmModule, runWasmModule } from 'src/workers/wasmModule'

export interface TreeFinalizeSequencesWasmModule {
  treeFinalize(treeStr: string, refFastaStr: string, analysisResultsStr: string): string
}

let module: TreeFinalizeSequencesWasmModule | undefined

export async function init() {
  try {
    module = await loadWasmModule('nextclade_wasm')
  } catch (error) {
    console.error(error)
  }
}

export function run(treeStr: string, refFastaStr: string, analysisResultsStr: string) {
  if (!module) {
    throw new Error(
      'Developer error: this WebAssembly module has not been initialized yet. Make sure to call `module.init()` function before `module.run()`',
    )
  }

  return runWasmModule(module, (module) => {
    return module.treeFinalize(treeStr, refFastaStr, analysisResultsStr)
  })
}

const treeFinalizeWorker = {
  init,
  run,
}

export type TreeFinalizeWorker = typeof treeFinalizeWorker
export type TreeFinalizeThread = TreeFinalizeWorker

expose(treeFinalizeWorker)
