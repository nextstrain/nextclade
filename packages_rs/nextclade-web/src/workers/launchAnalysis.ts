import { concurrent } from 'fasy'

import type { FastaRecordId, NextcladeResult } from 'src/algorithms/types'
import { AnalysisLauncherStatus } from 'src/workers/go.worker'
import { createGoWorker } from 'src/workers/run'

import qryFastaStr from '../../../../data_dev/sequences.fasta'

import tree from '../../../../data_dev/tree.json'
import qc from '../../../../data_dev/qc.json'
import virusProperties from '../../../../data_dev/virus_properties.json'
import refSeq from '../../../../data_dev/reference.fasta'
import primersCsv from '../../../../data_dev/primers.csv'
import geneMap from '../../../../data_dev/genemap.gff'

const NUM_THREADS = 20

export interface LaunchAnalysisCallbacks {
  onGlobalStatus: (record: AnalysisLauncherStatus) => void
  onParsedFasta: (record: FastaRecordId) => void
  onAnalysisResult: (record: NextcladeResult) => void
  onError: (error: Error) => void
  onComplete: () => void
}

export async function launchAnalysis({
  onGlobalStatus,
  onParsedFasta,
  onAnalysisResult,
  onError,
  onComplete,
}: LaunchAnalysisCallbacks) {
  console.log('launchAnalysis')

  const params = {
    ref_seq_str: refSeq,
    gene_map_str: geneMap,
    tree_str: JSON.stringify(tree),
    qc_config_str: JSON.stringify(qc),
    virus_properties_str: JSON.stringify(virusProperties),
    pcr_primers_str: primersCsv,
  }

  const launcherWorker = await createGoWorker()

  const subscriptions = [
    launcherWorker.getAnalysisGlobalStatusObservable().subscribe(onGlobalStatus),
    launcherWorker.getParsedFastaObservable().subscribe(onParsedFasta, onError),
    launcherWorker.getAnalysisResultsObservable().subscribe(onAnalysisResult, onError, onComplete),
  ]

  await launcherWorker.goWorker(NUM_THREADS, params, qryFastaStr)

  await concurrent.forEach(async (subscription) => subscription.unsubscribe(), subscriptions)
}
