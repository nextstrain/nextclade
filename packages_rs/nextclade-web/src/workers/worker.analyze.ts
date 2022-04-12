import 'regenerator-runtime'

import type { Thread } from 'threads'
import { expose } from 'threads/worker'

import { NextcladeWasm, NextcladeParams, AnalysisInput } from 'src/gen/nextclade-wasm'

import tree from '../../../../data_dev/tree.json'
import qc from '../../../../data_dev/qc.json'
import virusProperties from '../../../../data_dev/virus_properties.json'
import qrySeq from '../../../../data_dev/sequence.fasta'
import refSeq from '../../../../data_dev/reference.fasta'
import primersCsv from '../../../../data_dev/primers.csv'
import geneMap from '../../../../data_dev/genemap.gff'

const qry_seq_name = 'Hello!'

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
let gNextcladeWasm: NextcladeWasm | undefined

/** Creates the underlying WebAssembly module. */
async function create() {
  const params = NextcladeParams.from_js({
    ref_seq_str: refSeq,
    gene_map_str: geneMap,
    tree_str: JSON.stringify(tree),
    qc_config_str: JSON.stringify(qc),
    virus_properties_str: JSON.stringify(virusProperties),
    pcr_primers_str: primersCsv,
  })
  gNextcladeWasm = new NextcladeWasm(params)
  params.free()
}

/** Destroys the underlying WebAssembly module. */
async function destroy() {
  gNextcladeWasm?.free()
  gNextcladeWasm = undefined
}

/** Runs the underlying WebAssembly module. */
async function run() {
  if (!gNextcladeWasm) {
    throw new ErrorModuleNotInitialized()
  }
  const input = AnalysisInput.from_js({
    qry_seq_name,
    qry_seq_str: qrySeq,
  })
  const result = gNextcladeWasm.run(input)
  return result.to_js()
}

const analysisWorker = { create, destroy, run }
export type AnalysisWorker = typeof analysisWorker
export type AnalysisThread = AnalysisWorker & Thread

expose(analysisWorker)
