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

/** Creates the underlying WebAssembly module. */
async function create(params: NextcladeParamsRaw) {
  nextcladeWasm = NextcladeWasm.new(JSON.stringify(params))
}

/** Destroys the underlying WebAssembly module. */
async function destroy() {
  if (!nextcladeWasm) {
    return
  }

  nextcladeWasm.free()
  nextcladeWasm = undefined
}

async function getInitialData(): Promise<AnalysisInitialData> {
  if (!nextcladeWasm) {
    throw new ErrorModuleNotInitialized('getInitialData')
  }
  const initialDataStr = nextcladeWasm.get_initial_data()
  const initialData = JSON.parse(initialDataStr) as AnalysisInitialData
  return {
    ...initialData,
    geneMap: prepareGeneMap(initialData.geneMap),
  }
}

/** Runs the underlying WebAssembly module. */
async function analyze(record: FastaRecord): Promise<NextcladeResult> {
  if (!nextcladeWasm) {
    throw new ErrorModuleNotInitialized('analyze')
  }
  const input = JSON.stringify(record)
  const output = JSON.parse(nextcladeWasm.analyze(input)) as NextcladeResult
  if (!output.result && !output.error) {
    throw new ErrorBothResultsAndErrorAreNull()
  }
  return output
}

/** Retrieves the output tree from the WebAssembly module. */
export async function getOutputTrees(analysisResultsJsonStr: string): Promise<OutputTrees> {
  if (!nextcladeWasm) {
    throw new ErrorModuleNotInitialized('getOutputTrees')
  }
  return JSON.parse(nextcladeWasm.get_output_trees(analysisResultsJsonStr))
}

export async function parseSequencesStreaming(fastaStr: string) {
  try {
    NextcladeWasm.parse_query_sequences(fastaStr, (index: number, seqName: string, seq: string) =>
      onSequence({ index: Number(index), seqName, seq }),
    )
  } catch (error: unknown) {
    onError(sanitizeError(error))
  }
  onComplete()
}

export async function parseRefSequence(refFastaStr: string) {
  return NextcladeWasm.parse_ref_seq_fasta(refFastaStr)
}

export async function serializeResultsJson(
  outputs: AnalysisResult[],
  errors: AnalysisError[],
  cladeNodeAttrsJson: CladeNodeAttrDesc[],
  phenotypeAttrsJson: PhenotypeAttrDesc[],
  refNodes: AuspiceRefNodesDesc,
  nextcladeWebVersion: string,
) {
  return NextcladeWasm.serialize_results_json(
    JSON.stringify(outputs),
    JSON.stringify(errors),
    JSON.stringify(cladeNodeAttrsJson),
    JSON.stringify(phenotypeAttrsJson),
    JSON.stringify(refNodes),
    nextcladeWebVersion,
  )
}

export async function serializeResultsNdjson(results: AnalysisResult[], errors: AnalysisError[]) {
  return NextcladeWasm.serialize_results_ndjson(JSON.stringify(results), JSON.stringify(errors))
}

export async function serializeResultsCsv(
  results: AnalysisResult[],
  errors: AnalysisError[],
  cladeNodeAttrsJson: CladeNodeAttrDesc[],
  phenotypeAttrsJson: PhenotypeAttrDesc[],
  refNodesJson: AuspiceRefNodesDesc,
  aaMotifsDescs: AaMotifsDesc[],
  delimiter: string,
  csvColumnConfig: CsvColumnConfig,
) {
  return NextcladeWasm.serialize_results_csv(
    JSON.stringify(results),
    JSON.stringify(errors),
    JSON.stringify(cladeNodeAttrsJson),
    JSON.stringify(phenotypeAttrsJson),
    JSON.stringify(refNodesJson),
    JSON.stringify(aaMotifsDescs),
    delimiter,
    JSON.stringify(csvColumnConfig),
  )
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
  serializeResultsNdjson,
  values(): ThreadsObservable<FastaRecord> {
    return ThreadsObservable.from(gSubject)
  },
}

expose(worker)

export type NextcladeWasmWorker = typeof worker
export type NextcladeWasmThread = NextcladeWasmWorker & Thread
