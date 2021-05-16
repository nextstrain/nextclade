import 'regenerator-runtime'

import type { Thread } from 'threads'
import { expose } from 'threads/worker'

import type { AlgorithmInput } from 'src/workers/worker.parse'
import { loadWasmModule, runWasmModule } from './wasmModule'

export interface NextcladeWasmParams {
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
  init(params: NextcladeWasmParams): void

  analyze(seq: AlgorithmInput): NextcladeWasmResult
}

let module: NextcladeAnalysisModule | undefined

let gParams: NextcladeWasmParams | undefined

export async function init(params: NextcladeWasmParams) {
  try {
    gParams = params
    module = await loadWasmModule('nextclade_wasm')
  } catch (error) {
    console.error(error)
  }
}

export function run(seq: AlgorithmInput) {
  if (!module || !gParams) {
    throw new Error(
      'Developer error: this WebAssembly module has not been initialized yet. Make sure to call `module.init()` function before `module.run()`',
    )
  }

  return runWasmModule(module, (module) => {
    const result = module.analyze(
      seq.seqName,
      seq.seq,
      gParams.refStr,
      gParams.geneMapStr,
      gParams.geneMapName,
      gParams.treePreparedStr,
      gParams.pcrPrimersStr,
      gParams.qcConfigStr,
    )

    return {
      index: seq.index,
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
