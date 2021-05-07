import 'regenerator-runtime'

import type { Thread } from 'threads'
import { expose } from 'threads/worker'

import { loadWasmModule, runWasmModule } from './wasmModule'

export interface NextcladeWasmParams {
  index: number
  queryName: string
  queryStr: string
  refStr: string
  geneMapStr: string
  geneMapName: string
  treePreparedStr: string
  pcrPrimersStr: string
  qcConfigStr: string
}

export interface NextcladeWasmResult {
  ref: string
  query: string
  analysisResult: string
}

export interface NextcladeAnalysisModule {
  analyze(params: NextcladeWasmParams): NextcladeWasmResult
}

let module: NextcladeAnalysisModule | undefined

export async function init() {
  try {
    module = await loadWasmModule('nextclade_wasm')
  } catch (error) {
    console.error(error)
  }
}

export function run(params: NextcladeWasmParams) {
  if (!module) {
    throw new Error(
      'Developer error: this WebAssembly module has not been initialized yet. Make sure to call `module.init()` function before `module.run()`',
    )
  }

  return runWasmModule(module, (module) => {
    const result = module.analyze(
      params.queryName,
      params.queryStr,
      params.refStr,
      params.geneMapStr,
      params.geneMapName,
      params.treePreparedStr,
      params.pcrPrimersStr,
      params.qcConfigStr,
    )

    return {
      index: params.index,
      ref: result.ref,
      query: result.query,
      analysisResult: JSON.parse(result.analysisResult),
    }
  })
}

const analysisWorker = { init, run }

export type AnalysisWorker = typeof analysisWorker

export type AnalysisThread = AnalysisWorker & Thread

expose(analysisWorker)
