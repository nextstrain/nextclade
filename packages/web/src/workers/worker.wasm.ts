import 'regenerator-runtime'

import { expose } from 'threads/worker'

import { loadWasmModule, runWasmModule } from './wasmModule'

import qcConfig from '../../../../data/sars-cov-2/qc.json'
import treeJson from '../../../../data/sars-cov-2/tree.json'
import geneMapStr from '../../../../data/sars-cov-2/genemap.gff'
import refStr from '../../../../data/sars-cov-2/reference.fasta'

type MyModule = any

let module: MyModule | undefined

export async function init() {
  try {
    module = await loadWasmModule('nextclade_wasm')
  } catch (error) {
    console.error(error)
  }
}

export function run(index: number, queryName: string, queryStr: string) {
  if (!module) {
    throw new Error(
      'Developer error: this WebAssembly module has not been initialized yet. Make sure to call `module.init()` function before `module.run()`',
    )
  }

  const geneMapName = 'genemap.gff'
  const treeString = JSON.stringify(treeJson)
  const pcrPrimersStr = ''
  const qcConfigStr = JSON.stringify(qcConfig)

  return runWasmModule(module, (module) => {
    const results = module.runNextclade(
      // prettier-ignore
      index,
      queryName,
      queryStr,
      refStr,
      geneMapStr,
      geneMapName,
      treeString,
      pcrPrimersStr,
      qcConfigStr,
    )
    return JSON.parse(results)
  })
}

const worker = { init, run }

export type WasmWorker = typeof worker

export type WasmThread = WasmWorker

expose(worker)
