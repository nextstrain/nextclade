import 'regenerator-runtime'

import type { CladeNodeAttrDesc } from 'auspice'
import { AnalysisInitialData } from 'src/types'
import type { Thread } from 'threads'
import { expose } from 'threads/worker'
import { Observable as ThreadsObservable, Subject } from 'threads/observable'

import type {
  AaMotifsDesc,
  AnalysisError,
  AnalysisResult,
  CsvColumnConfig,
  ErrorsFromWeb,
  FastaRecord,
  NextcladeParamsRaw,
  NextcladeResult,
  PhenotypeAttrDesc,
} from 'src/types'
import { NextcladeWasm } from 'src/gen/nextclade-wasm'
import { sanitizeError } from 'src/helpers/sanitizeError'
import { ErrorInternal } from 'src/helpers/ErrorInternal'
import { prepareGeneMap } from 'src/io/prepareGeneMap'

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
  nextcladeWasm = new NextcladeWasm(JSON.stringify(params))
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
  const aaa = nextcladeWasm.get_initial_data()
  const initialData = JSON.parse(aaa) as AnalysisInitialData
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

// export async function getCladeNodeAttrKeyDescs(): Promise<string> {
//   if (!nextcladeWasm) {
//     throw new ErrorModuleNotInitialized()
//   }
//   return nextcladeWasm.get_clade_node_attr_key_descs()
// }

/** Retrieves the output tree from the WebAssembly module. */
export async function getOutputTree(analysisResultsJsonStr: string): Promise<string> {
  if (!nextcladeWasm) {
    throw new ErrorModuleNotInitialized('getOutputTree')
  }
  return nextcladeWasm.get_output_tree(analysisResultsJsonStr)
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

// export async function parseTree(treeJsonStr: string) {
//   NextcladeWasm.validate_tree_json(treeJsonStr)
// }
//
// export async function parseGeneMapGffString(geneMapGffStr: string) {
//   return NextcladeWasm.parse_gene_map_gff(geneMapGffStr)
// }
//
// export async function parsePcrPrimerCsvRowsStr(pcrPrimersCsvStr: string, refSeqStr: string) {
//   NextcladeWasm.validate_primers_csv(pcrPrimersCsvStr, refSeqStr)
// }
//
// export async function parseQcConfigString(qcConfigJsonStr: string) {
//   NextcladeWasm.validate_qc_config(qcConfigJsonStr)
// }
//
// export async function parseVirusJsonString(virusJsonStr: string) {
//   NextcladeWasm.validate_virus_properties_json(virusJsonStr)
// }

export async function serializeResultsJson(
  outputs: AnalysisResult[],
  errors: AnalysisError[],
  cladeNodeAttrsJson: CladeNodeAttrDesc[],
  phenotypeAttrsJson: PhenotypeAttrDesc[],
  nextcladeWebVersion: string,
) {
  return NextcladeWasm.serialize_results_json(
    JSON.stringify(outputs),
    JSON.stringify(errors),
    JSON.stringify(cladeNodeAttrsJson),
    JSON.stringify(phenotypeAttrsJson),
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
  aaMotifsDescs: AaMotifsDesc[],
  delimiter: string,
  csvColumnConfig: CsvColumnConfig,
) {
  return NextcladeWasm.serialize_results_csv(
    JSON.stringify(results),
    JSON.stringify(errors),
    JSON.stringify(cladeNodeAttrsJson),
    JSON.stringify(phenotypeAttrsJson),
    JSON.stringify(aaMotifsDescs),
    delimiter,
    JSON.stringify(csvColumnConfig),
  )
}

async function serializeInsertionsCsv(results: AnalysisResult[], errors: AnalysisError[]) {
  return NextcladeWasm.serialize_insertions_csv(JSON.stringify(results), JSON.stringify(errors))
}

async function serializeErrorsCsv(errors: ErrorsFromWeb[]) {
  return NextcladeWasm.serialize_errors_csv(JSON.stringify(errors))
}

const worker = {
  create,
  destroy,
  getInitialData,
  analyze,
  getOutputTree,
  parseSequencesStreaming,
  parseRefSequence,
  // parseTree,
  // parseGeneMapGffString,
  // parsePcrPrimerCsvRowsStr,
  // parseQcConfigString,
  // parseVirusJsonString,
  serializeResultsJson,
  serializeResultsCsv,
  serializeResultsNdjson,
  serializeInsertionsCsv,
  serializeErrorsCsv,
  values(): ThreadsObservable<FastaRecord> {
    return ThreadsObservable.from(gSubject)
  },
}

expose(worker)

export type NextcladeWasmWorker = typeof worker
export type NextcladeWasmThread = NextcladeWasmWorker & Thread
