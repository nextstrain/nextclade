import 'regenerator-runtime'

import type { Thread } from 'threads'
import { expose } from 'threads/worker'

import type { AnalysisResult, Peptide, SequenceParserResult } from 'src/algorithms/types'
import { loadWasmModule, runWasmModule } from './wasmModule'

export interface NextcladeWasmParams {
  refStr: string
  refName: string
  geneMapStr: string
  geneMapName: string
  treePreparedStr: string
  pcrPrimerCsvRowsStr: string
  pcrPrimersFilename: string
  qcConfigStr: string
}

export interface NextcladeWasmResult {
  index: number
  ref: string
  query: string
  queryPeptides: string
  analysisResult: string
  warnings: string[]
  hasError: boolean
  error: string
}

export interface NextcladeResult {
  index: number
  ref: string
  query: string
  queryPeptides: Peptide[]
  analysisResult: AnalysisResult
  warnings: string[]
  hasError: boolean
  error: string
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
      params.pcrPrimerCsvRowsStr,
      params.pcrPrimersFilename,
      params.qcConfigStr,
    )
  })
}

export function parseAnalysisResult(analysisResultStr: string): AnalysisResult {
  return JSON.parse(analysisResultStr) as AnalysisResult // TODO: validate
}

export function parsePeptides(peptidesStr: string): Peptide[] {
  return JSON.parse(peptidesStr) as Peptide[] // TODO: validate
}

/** Runs the Nextclade analysis step. Requires `init()` to be called first. */
export async function analyze(seq: SequenceParserResult) {
  if (!gModule || !gNextcladeWasm) {
    throw new TypeError(
      'Developer error: this WebWorker module has not been initialized yet. Make sure to call `module.init()` function.',
    )
  }

  const nextcladeWasm = gNextcladeWasm

  return runWasmModule<NextcladeAnalysisModule, NextcladeResult>(gModule, () => {
    const result = nextcladeWasm.analyze(seq.seqName, seq.seq)

    if (result.hasError) {
      return {
        index: seq.index,
        ref: undefined,
        query: undefined,
        queryPeptides: [],
        analysisResult: undefined,
        warnings: [],
        hasError: result.hasError,
        error: result.error,
      }
    }

    return {
      index: seq.index,
      ref: result.ref,
      query: result.query,
      queryPeptides: parsePeptides(result.queryPeptides),
      analysisResult: parseAnalysisResult(result.analysisResult),
      warnings: result.warnings,
      hasError: result.hasError,
      error: result.error,
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
