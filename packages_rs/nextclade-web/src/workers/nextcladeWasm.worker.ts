/* eslint-disable camelcase */
import 'regenerator-runtime'

import type { SequenceParserResult } from 'src/algorithms/types'
import { sanitizeError } from 'src/helpers/sanitizeError'
import type { Thread } from 'threads'
import { expose } from 'threads/worker'
import { Observable as ThreadsObservable, Subject } from 'threads/observable'

import { NextcladeWasm, NextcladeParams, AnalysisInput, NextcladeParamsPojo } from 'src/gen/nextclade-wasm'

// import tree from '../../../../data_dev/tree.json'
// import qc from '../../../../data_dev/qc.json'
// import virusProperties from '../../../../data_dev/virus_properties.json'
// import qrySeq from '../../../../data_dev/sequence.fasta'
// import refSeq from '../../../../data_dev/reference.fasta'
// import primersCsv from '../../../../data_dev/primers.csv'
// import geneMap from '../../../../data_dev/genemap.gff'

// const qry_seq_name = 'Hello!'

const gSubject = new Subject<SequenceParserResult>()

function onSequence(seq: SequenceParserResult) {
  gSubject?.next(seq)
}

function onComplete() {
  gSubject?.complete()
}

function onError(error: Error) {
  gSubject?.error(error)
}

export class ErrorModuleNotInitialized extends Error {
  constructor() {
    super(
      'Developer error: this WebWorker module has not been initialized yet. Make sure to call `module.create()` function.',
    )
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
  // const params = NextcladeParams.from_js({
  //   ref_seq_str: refSeq,
  //   gene_map_str: geneMap,
  //   tree_str: JSON.stringify(tree),
  //   qc_config_str: JSON.stringify(qc),
  //   virus_properties_str: JSON.stringify(virusProperties),
  //   pcr_primers_str: primersCsv,
  // })
  const params = NextcladeParams.from_js(params_pojo)
  nextcladeWasm = new NextcladeWasm(params)
  params.free()
}

/** Destroys the underlying WebAssembly module. */
async function destroy() {
  if (!nextcladeWasm) {
    throw new ErrorModuleNotInitialized()
  }

  nextcladeWasm.free()
  nextcladeWasm = undefined
}

/** Runs the underlying WebAssembly module. */
async function analyze(qryName: string, qrySeq: string) {
  if (!nextcladeWasm) {
    throw new ErrorModuleNotInitialized()
  }
  const input = AnalysisInput.from_js({
    qry_seq_name: qryName,
    qry_seq_str: qrySeq,
  })
  const result = nextcladeWasm.analyze(input)
  return result.to_js()
}

// export async function getCladeNodeAttrKeyDescs(): Promise<string> {
//   if (!nextcladeWasm) {
//     throw new ErrorModuleNotInitialized()
//   }
//   return nextcladeWasm.get_clade_node_attr_key_descs()
// }

/** Retrieves the output tree from the WebAssembly module. */
export function getOutputTree(analysisResultsJsonStr: string): string {
  if (!nextcladeWasm) {
    throw new ErrorModuleNotInitialized()
  }
  return nextcladeWasm.get_output_tree(analysisResultsJsonStr)
}

export async function parseSequencesStreaming(fastaStr: string) {
  try {
    NextcladeWasm.parse_query_sequences(fastaStr, (index: number, seqName: string, seq: string) =>
      onSequence({ index, seqName, seq }),
    )
  } catch (error: unknown) {
    onError(sanitizeError(error))
  }
  onComplete()
}

export async function parseRefSequence(refFastaStr: string) {
  NextcladeWasm.validate_ref_seq_fasta(refFastaStr)
}

export async function parseTree(treeJsonStr: string) {
  NextcladeWasm.validate_tree_json(treeJsonStr)
}

export async function parseGeneMapGffString(geneMapGffStr: string) {
  NextcladeWasm.validate_gene_map_gff(geneMapGffStr)
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

const worker = {
  create,
  destroy,
  // getCladeNodeAttrKeyDescs,
  analyze,
  getOutputTree,
  parseSequencesStreaming,
  parseRefSequence,
  parseTree,
  parseGeneMapGffString,
  parsePcrPrimerCsvRowsStr,
  parseQcConfigString,
  parseVirusJsonString,
  values(): ThreadsObservable<SequenceParserResult> {
    return ThreadsObservable.from(gSubject)
  },
}

expose(worker)

export type NextcladeWasmWorker = typeof worker
export type NextcladeWasmThread = NextcladeWasmWorker & Thread
export { type Observable as ThreadsObservable } from 'threads/observable'
