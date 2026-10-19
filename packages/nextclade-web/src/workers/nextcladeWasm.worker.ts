import 'regenerator-runtime'

import type { CladeNodeAttrDesc } from 'auspice'
import { AnalysisInitialData, AuspiceRefNodesDesc, OutputTrees } from 'src/types'
import type { Thread } from 'threads'
import { expose } from 'threads/worker'
import { Observable as ThreadsObservable, Subject } from 'threads/observable'

import type {
  AaMotifsDesc,
  AnalysisError,
  AnalysisResult,
  CsvColumnConfig,
  FastaRecord,
  NextcladeParamsRaw,
  NextcladeResult,
  PhenotypeAttrDesc,
} from 'src/types'
import { sanitizeError } from 'src/helpers/sanitizeError'
import { ErrorInternal } from 'src/helpers/ErrorInternal'
import { prepareGeneMap } from 'src/io/prepareGeneMap'
import { NextcladeWasm } from 'src/gen/nextclade-wasm'
import { WasmCallGuard } from 'src/workers/WasmCallGuard'

const gSubject = new Subject<FastaRecord>()

function onSequence(seq: FastaRecord) {
  gSubject.next(seq)
}

function onComplete() {
  gSubject.complete()
}

function onError(error: Error) {
  gSubject.error(error)
}

export class ErrorModuleNotInitialized extends ErrorInternal {
  constructor(fnName: string) {
    super(
      `This WebWorker module has not been initialized yet. When calling module.${fnName} Make sure to call 'module.create()' function.`,
    )
  }
}

export class ErrorBothResultsAndErrorAreNull extends ErrorInternal {
  constructor() {
    super(`Both the 'results' and 'error' returned from the analysis wasm module are 'null'. This should never happen.`)
  }
}

/**
 * Keeps the reference to the WebAssembly module.The module is stateful and requires manual initialization
 * and teardown.
 * This cloud be a class instance, but unfortunately we cannot pass classes to/from WebWorkers (yet?).
 */
let nextcladeWasm: NextcladeWasm | undefined

/** Guards every call into the WebAssembly instance of this worker against use after a fatal error */
const wasmCallGuard = new WasmCallGuard()

/** Creates the underlying WebAssembly module. */
async function create(params: NextcladeParamsRaw) {
  const paramsStr = JSON.stringify(params)
  nextcladeWasm = wasmCallGuard.call(() => NextcladeWasm.new(paramsStr))
}

/** Destroys the underlying WebAssembly module. */
async function destroy() {
  if (!nextcladeWasm) {
    return
  }

  try {
    nextcladeWasm.free()
  } catch {
    // Ignore errors during cleanup - WASM state may be corrupted after a panic.
    // Logging the cleanup error would mask the original panic message.
  }
  nextcladeWasm = undefined
}

function getNextcladeWasm(fnName: string): NextcladeWasm {
  if (!nextcladeWasm) {
    throw new ErrorModuleNotInitialized(fnName)
  }
  return nextcladeWasm
}

async function getInitialData(datasetName: string): Promise<AnalysisInitialData> {
  const wasm = getNextcladeWasm('getInitialData')
  const initialDataStr = wasmCallGuard.call(() => wasm.get_initial_data(datasetName))
  const initialData = JSON.parse(initialDataStr) as AnalysisInitialData
  return {
    ...initialData,
    geneMap: prepareGeneMap(initialData.geneMap),
  }
}

/** Runs the underlying WebAssembly module. */
async function analyze(datasetName: string, record: FastaRecord): Promise<NextcladeResult> {
  const wasm = getNextcladeWasm('analyze')
  const input = JSON.stringify(record)
  const outputStr = wasmCallGuard.call(() => wasm.analyze(datasetName, input))
  const output = JSON.parse(outputStr) as NextcladeResult
  if (!output.result && !output.error) {
    throw new ErrorBothResultsAndErrorAreNull()
  }
  return output
}

/** Retrieves the output tree from the WebAssembly module. */
export async function getOutputTrees(
  datasetName: string,
  analysisResultsJsonStr: string,
): Promise<OutputTrees | undefined | null> {
  const wasm = getNextcladeWasm('getOutputTrees')
  return JSON.parse(wasmCallGuard.call(() => wasm.get_output_trees(datasetName, analysisResultsJsonStr)))
}

export async function parseSequencesStreaming(fastaStr: string) {
  try {
    wasmCallGuard.call(() =>
      NextcladeWasm.parse_query_sequences(fastaStr, (index: number, seqName: string, seq: string) =>
        onSequence({ index: Number(index), seqName, seq }),
      ),
    )
  } catch (error: unknown) {
    onError(sanitizeError(error))
  }
  onComplete()
}

export async function parseRefSequence(refFastaStr: string) {
  return wasmCallGuard.call(() => NextcladeWasm.parse_ref_seq_fasta(refFastaStr))
}

export async function serializeResultsJson(
  outputs: AnalysisResult[],
  errors: AnalysisError[],
  cladeNodeAttrsJson: CladeNodeAttrDesc[],
  phenotypeAttrsJson: PhenotypeAttrDesc[],
  refNodes: AuspiceRefNodesDesc,
  nextcladeWebVersion: string,
) {
  const outputsStr = JSON.stringify(outputs)
  const errorsStr = JSON.stringify(errors)
  const cladeNodeAttrsStr = JSON.stringify(cladeNodeAttrsJson)
  const phenotypeAttrsStr = JSON.stringify(phenotypeAttrsJson)
  const refNodesStr = JSON.stringify(refNodes)
  return wasmCallGuard.call(() =>
    NextcladeWasm.serialize_results_json(
      outputsStr,
      errorsStr,
      cladeNodeAttrsStr,
      phenotypeAttrsStr,
      refNodesStr,
      nextcladeWebVersion,
    ),
  )
}

export async function serializeResultsNdjson(results: AnalysisResult[], errors: AnalysisError[]) {
  const resultsStr = JSON.stringify(results)
  const errorsStr = JSON.stringify(errors)
  return wasmCallGuard.call(() => NextcladeWasm.serialize_results_ndjson(resultsStr, errorsStr))
}

export async function serializeResultsCsv(
  results: AnalysisResult[],
  errors: AnalysisError[],
  cladeNodeAttrsJson: CladeNodeAttrDesc[],
  phenotypeAttrsJson: PhenotypeAttrDesc[],
  refNodesJson: AuspiceRefNodesDesc,
  aaMotifsDescs: AaMotifsDesc[],
  mutationPatternKeys: string[],
  delimiter: string,
  csvColumnConfig: CsvColumnConfig,
) {
  const resultsStr = JSON.stringify(results)
  const errorsStr = JSON.stringify(errors)
  const cladeNodeAttrsStr = JSON.stringify(cladeNodeAttrsJson)
  const phenotypeAttrsStr = JSON.stringify(phenotypeAttrsJson)
  const refNodesStr = JSON.stringify(refNodesJson)
  const aaMotifsDescsStr = JSON.stringify(aaMotifsDescs)
  const mutationPatternKeysStr = JSON.stringify(mutationPatternKeys)
  const csvColumnConfigStr = JSON.stringify(csvColumnConfig)
  return wasmCallGuard.call(() =>
    NextcladeWasm.serialize_results_csv(
      resultsStr,
      errorsStr,
      cladeNodeAttrsStr,
      phenotypeAttrsStr,
      refNodesStr,
      aaMotifsDescsStr,
      mutationPatternKeysStr,
      delimiter,
      csvColumnConfigStr,
    ),
  )
}

export async function serializeResultsExcel(
  results: AnalysisResult[],
  errors: AnalysisError[],
  allInitialData: Map<string, AnalysisInitialData>,
  csvColumnConfig: CsvColumnConfig,
  datasetNameToSeqIndices: Map<string, number[]>,
  seqIndicesWithoutDatasetSuggestions: number[],
) {
  const resultsStr = JSON.stringify(results)
  const errorsStr = JSON.stringify(errors)
  const allInitialDataStr = JSON.stringify(Object.fromEntries(allInitialData))
  const csvColumnConfigStr = JSON.stringify(csvColumnConfig)
  const datasetNameToSeqIndicesStr = JSON.stringify(Object.fromEntries(datasetNameToSeqIndices))
  const seqIndicesWithoutDatasetSuggestionsStr = JSON.stringify(seqIndicesWithoutDatasetSuggestions)
  return wasmCallGuard.call(() =>
    NextcladeWasm.serialize_results_excel(
      resultsStr,
      errorsStr,
      allInitialDataStr,
      csvColumnConfigStr,
      datasetNameToSeqIndicesStr,
      seqIndicesWithoutDatasetSuggestionsStr,
    ),
  )
}

export async function serializeUnknownCsv(
  errors: AnalysisError[],
  seqIndicesWithoutDatasetSuggestions: number[],
  delimiter: string,
) {
  const errorsStr = JSON.stringify(errors)
  const seqIndicesWithoutDatasetSuggestionsStr = JSON.stringify(seqIndicesWithoutDatasetSuggestions)
  return wasmCallGuard.call(() =>
    NextcladeWasm.serialize_unknown_csv(errorsStr, seqIndicesWithoutDatasetSuggestionsStr, delimiter),
  )
}

export async function serializeResultsGff(results: AnalysisResult[]) {
  const resultsStr = JSON.stringify(results)
  return wasmCallGuard.call(() => NextcladeWasm.serialize_results_gff(resultsStr))
}

export async function serializeResultsTbl(results: AnalysisResult[]) {
  const resultsStr = JSON.stringify(results)
  return wasmCallGuard.call(() => NextcladeWasm.serialize_results_tbl(resultsStr))
}

const worker = {
  create,
  destroy,
  getInitialData,
  analyze,
  getOutputTrees,
  parseSequencesStreaming,
  parseRefSequence,
  serializeResultsJson,
  serializeResultsCsv,
  serializeResultsExcel,
  serializeResultsNdjson,
  serializeResultsGff,
  serializeResultsTbl,
  serializeUnknownCsv,
  values(): ThreadsObservable<FastaRecord> {
    return ThreadsObservable.from(gSubject)
  },
}

expose(worker)

export type NextcladeWasmWorker = typeof worker
export type NextcladeWasmThread = NextcladeWasmWorker & Thread
