import 'regenerator-runtime'

import { expose } from 'threads/worker'

import { loadWasmModule, runWasmModule } from './wasmModule'

import qcConfig from '../../../../data/sars-cov-2/qc.json'
import geneMapStr from '../../../../data/sars-cov-2/genemap.gff'
import refStr from '../../../../data/sars-cov-2/reference.fasta'

export interface NextcladeResultWasm {
  ref: string
  query: string
  analysisResult: string
}

export interface NextcladeAnalysisModule {
  runNextclade(
    index: number,
    queryName: string,
    queryStr: string,
    refStr: string,
    geneMapStr: string,
    geneMapName: string,
    treePreparedStr: string,
    pcrPrimersStr: string,
    qcConfigStr: string,
  ): NextcladeResultWasm
}

let module: NextcladeAnalysisModule | undefined

export async function init() {
  try {
    module = await loadWasmModule('nextclade_wasm')
  } catch (error) {
    console.error(error)
  }
}

export function run(index: number, queryName: string, queryStr: string, treePreparedStr: string) {
  if (!module) {
    throw new Error(
      'Developer error: this WebAssembly module has not been initialized yet. Make sure to call `module.init()` function before `module.run()`',
    )
  }

  const geneMapName = 'genemap.gff'
  const pcrPrimersStr = ''
  const qcConfigStr = JSON.stringify(qcConfig)

  return runWasmModule(module, (module) => {
    const result = module.runNextclade(
      // prettier-ignore
      index,
      queryName,
      queryStr,
      refStr,
      geneMapStr,
      geneMapName,
      treePreparedStr,
      pcrPrimersStr,
      qcConfigStr,
    )

    return {
      ref: result.ref,
      query: result.query,
      analysisResult: JSON.parse(result.analysisResult),
    }
  })
}

const analysisWorker = { init, run }

export type AnalysisWorker = typeof analysisWorker

export type AnalysisThread = AnalysisWorker

expose(analysisWorker)
