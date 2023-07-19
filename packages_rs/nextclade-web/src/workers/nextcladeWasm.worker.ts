/* eslint-disable camelcase */
import 'regenerator-runtime'
import { AuspiceJsonV2 } from 'auspice'

import type { CladeNodeAttrDesc } from 'auspice'
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
  NextcladeResult,
  PhenotypeAttrDesc,
  Translation,
} from 'src/types'
import type { LaunchAnalysisInitialData } from 'src/workers/launchAnalysis'
import type { NextcladeParamsPojo, AnalysisOutputPojo } from 'src/gen/nextclade-wasm'
import { NextcladeWasm, NextcladeParams, AnalysisInput, OutputTreesPojo } from 'src/gen/nextclade-wasm'
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
async function create(params_pojo: NextcladeParamsPojo) {
  const params = NextcladeParams.from_js(params_pojo)
  nextcladeWasm = new NextcladeWasm(params)
  params.free()
}

/** Destroys the underlying WebAssembly module. */
async function destroy() {
  if (!nextcladeWasm) {
    return
  }

  nextcladeWasm.free()
  nextcladeWasm = undefined
}

async function getInitialData(): Promise<LaunchAnalysisInitialData> {
  if (!nextcladeWasm) {
    throw new ErrorModuleNotInitialized('getInitialData')
  }
  const initialData = nextcladeWasm.get_initial_data()
  const {
    gene_map,
    genome_size,
    clade_node_attr_key_descs,
    phenotype_attr_descs,
    aa_motifs_descs,
    csv_column_config_default,
  } = initialData.to_js()
  initialData.free()

  return {
    genes: prepareGeneMap(gene_map),
    genomeSize: Number(genome_size),
    cladeNodeAttrKeyDescs: JSON.parse(clade_node_attr_key_descs) as CladeNodeAttrDesc[],
    phenotypeAttrDescs: JSON.parse(phenotype_attr_descs) as PhenotypeAttrDesc[],
    aaMotifsDescs: JSON.parse(aa_motifs_descs) as AaMotifsDesc[],
    csvColumnConfig: JSON.parse(csv_column_config_default) as CsvColumnConfig,
  }
}

/** Runs the underlying WebAssembly module. */
async function analyze(record: FastaRecord): Promise<NextcladeResult> {
  if (!nextcladeWasm) {
    throw new ErrorModuleNotInitialized('analyze')
  }

  const { index, seqName, seq } = record

  const input = AnalysisInput.from_js({
    qry_index: index,
    qry_seq_name: seqName,
    qry_seq_str: seq,
  })

  const output = nextcladeWasm.analyze(input)

  try {
    const { result, error } = output.to_js()

    if (result) {
      const { query, query_peptides, analysis_result } = result as unknown as AnalysisOutputPojo

      const queryPeptides = JSON.parse(query_peptides) as Translation
      const analysisResult = JSON.parse(analysis_result) as AnalysisResult

      return {
        index,
        seqName,
        result: {
          query,
          queryPeptides,
          analysisResult,
        },
      }
    }

    if (error) {
      return {
        index,
        seqName,
        error,
      }
    }

    throw new ErrorBothResultsAndErrorAreNull()
  } finally {
    output.free()
  }
}

// export async function getCladeNodeAttrKeyDescs(): Promise<string> {
//   if (!nextcladeWasm) {
//     throw new ErrorModuleNotInitialized()
//   }
//   return nextcladeWasm.get_clade_node_attr_key_descs()
// }

/** Retrieves the output tree from the WebAssembly module. */
export async function getOutputTrees(analysisResultsJsonStr: string): Promise<OutputTreesPojo> {
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

export async function parseTree(treeJsonStr: string) {
  NextcladeWasm.validate_tree_json(treeJsonStr)
}

export async function parseGeneMapGffString(geneMapGffStr: string) {
  return NextcladeWasm.parse_gene_map_gff(geneMapGffStr)
}

export async function parsePcrPrimerCsvRowsStr(pcrPrimersCsvStr: string, refSeqStr: string) {
  NextcladeWasm.validate_primers_csv(pcrPrimersCsvStr, refSeqStr)
}

export async function parseQcConfigString(qcConfigJsonStr: string) {
  NextcladeWasm.validate_qc_config(qcConfigJsonStr)
}

export async function parseVirusJsonString(virusJsonStr: string) {
  NextcladeWasm.validate_virus_properties_json(virusJsonStr)
}

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

async function getOutputTreeNwk() {
  if (!nextcladeWasm) {
    throw new ErrorModuleNotInitialized('getOutputTreeNwk')
  }
  return nextcladeWasm.get_output_tree_nwk()
}

const worker = {
  create,
  destroy,
  getInitialData,
  analyze,
  getOutputTrees,
  parseSequencesStreaming,
  parseRefSequence,
  parseTree,
  parseGeneMapGffString,
  parsePcrPrimerCsvRowsStr,
  parseQcConfigString,
  parseVirusJsonString,
  serializeResultsJson,
  serializeResultsCsv,
  serializeResultsNdjson,
  serializeInsertionsCsv,
  serializeErrorsCsv,
  getOutputTreeNwk,
  values(): ThreadsObservable<FastaRecord> {
    return ThreadsObservable.from(gSubject)
  },
}

expose(worker)

export type NextcladeWasmWorker = typeof worker
export type NextcladeWasmThread = NextcladeWasmWorker & Thread
