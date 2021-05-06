import 'regenerator-runtime'

import { expose } from 'threads/worker'

import { loadWasmModule, runWasmModule } from 'src/workers/wasmModule'

export interface TreePrepareSequencesWasmModule {
  treePrepare(treeStr: string, refFastaStr: string): string
}

let module: TreePrepareSequencesWasmModule | undefined

export async function init() {
  try {
    module = await loadWasmModule('nextclade_wasm')
  } catch (error) {
    console.error(error)
  }
}

export function run(treeStr: string, refFastaStr: string) {
  if (!module) {
    throw new Error(
      'Developer error: this WebAssembly module has not been initialized yet. Make sure to call `module.init()` function before `module.run()`',
    )
  }

  return runWasmModule(module, (module) => {
    return module.treePrepare(treeStr, refFastaStr)
  })
}

const treePrepareWorker = {
  init,
  run,
}

export type TreePrepareWorker = typeof treePrepareWorker
export type TreePrepareThread = TreePrepareWorker

expose(treePrepareWorker)
