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
  pcrPrimersFilename: string
  qcConfigStr: string
}

export interface NextcladeWasmResult {
  index: number
  ref: string
  query: string
  analysisResult: string
}

export interface NextcladeWasmClass {
  // Reason: we don't have a real Typescript class here, it's in C++
  // eslint-disable-next-line @typescript-eslint/no-misused-new
  new (
    refStr: string,
    geneMapStr: string,
    geneMapName: string,
    treePreparedStr: string,
    pcrPrimersStr: string,
    pcrPrimersFilename: string,
    qcConfigStr: string,
  ): NextcladeWasmClass

  analyze(seqName: string, seq: string): NextcladeWasmResult

  delete(): void
}

export interface NextcladeAnalysisModule {
  NextcladeWasm: NextcladeWasmClass
}

let gModule: NextcladeAnalysisModule | undefined
let gNextcladeWasm: NextcladeWasmClass | undefined

/**
 * Initializes this webworker.
 * This webworker relies on a stateful WASM module. We initialize the state (by calling C++ constructor) separately here.
 * This is to avoid passing and serializing-deserializing the constant state on every call of `analyze()`.
 */
export async function init(params: NextcladeWasmParams) {
  const module = await loadWasmModule<NextcladeAnalysisModule>('nextclade_wasm')
  gModule = module

  gNextcladeWasm = await runWasmModule<NextcladeAnalysisModule, NextcladeWasmClass>(module, () => {
    return new module.NextcladeWasm(
      params.refStr,
      params.geneMapStr,
      params.geneMapName,
      params.treePreparedStr,
      params.pcrPrimersStr,
      params.pcrPrimersFilename,
      params.qcConfigStr,
    )
  })
}

/** Runs the Nextclade analysis step. Requires `init()` to be called first. */
export async function analyze(seq: AlgorithmInput) {
  if (!gModule || !gNextcladeWasm) {
    throw new TypeError(
      'Developer error: this WebWorker module has not been initialized yet. Make sure to call `module.init()` function.',
    )
  }

  const nextcladeWasm = gNextcladeWasm

  return runWasmModule<NextcladeAnalysisModule, NextcladeWasmResult>(gModule, () => {
    const result = nextcladeWasm.analyze(seq.seqName, seq.seq)
    return {
      index: seq.index,
      ref: result.ref,
      query: result.query,
      analysisResult: JSON.parse(result.analysisResult),
    }
  })
}

export async function destroy() {
  const module = gModule
  const nextcladeWasm = gNextcladeWasm

  if (!module || !nextcladeWasm) {
    throw new TypeError(
      'Developer error: this WebWorker module has not been initialized yet. Make sure to call `module.init()` function.',
    )
  }

  return runWasmModule<NextcladeAnalysisModule, void>(module, () => {
    nextcladeWasm.delete()
  })
}

const analysisWorker = { init, analyze, destroy }
export type AnalysisWorker = typeof analysisWorker
export type AnalysisThread = AnalysisWorker & Thread

expose(analysisWorker)
