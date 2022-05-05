import { concurrent } from 'fasy'

import type { DatasetFiles, DatasetFlat, FastaRecordId, NextcladeResult } from 'src/algorithms/types'
import type { NextcladeParamsPojo } from 'src/gen'
import { AlgorithmInput } from 'src/state/algorithm/algorithm.state'
import { AnalysisLauncherStatus } from 'src/workers/go.worker'
import { createGoWorker } from 'src/workers/run'
import { axiosFetchRaw } from 'src/io/axiosFetch'

export interface LaunchAnalysisInputs {
  ref_seq_str?: AlgorithmInput
  gene_map_str?: AlgorithmInput
  tree_str?: AlgorithmInput
  qc_config_str?: AlgorithmInput
  virus_properties_str?: AlgorithmInput
  pcr_primers_str?: AlgorithmInput
}

export interface LaunchAnalysisCallbacks {
  onGlobalStatus: (record: AnalysisLauncherStatus) => void
  onParsedFasta: (record: FastaRecordId) => void
  onAnalysisResult: (record: NextcladeResult) => void
  onError: (error: Error) => void
  onComplete: () => void
}

/** Maps input field names to the dataset field names, so that we know which one to take */
const DATASET_FILE_NAME_MAPPING: Record<keyof LaunchAnalysisInputs, keyof DatasetFiles> = {
  ref_seq_str: 'reference',
  gene_map_str: 'geneMap',
  tree_str: 'tree',
  qc_config_str: 'qc',
  virus_properties_str: 'virusPropertiesJson',
  pcr_primers_str: 'primers',
}

export async function launchAnalysis(
  qryFastaInput: Promise<AlgorithmInput | undefined>,
  paramInputs: LaunchAnalysisInputs,
  callbacks: LaunchAnalysisCallbacks,
  dataset: DatasetFlat,
  numThreads: number,
) {
  const { onGlobalStatus, onParsedFasta, onAnalysisResult, onError, onComplete } = callbacks

  // Resolve inputs into the actual strings
  const qryFastaStr = await getQueryFasta(await qryFastaInput)
  const params = await getParams(paramInputs, dataset)

  // Create a launcher worker that will schedule other workers
  const launcherWorker = await createGoWorker()

  // Subscribe to launcher worker events
  const subscriptions = [
    launcherWorker.getAnalysisGlobalStatusObservable().subscribe(onGlobalStatus),
    launcherWorker.getParsedFastaObservable().subscribe(onParsedFasta, onError),
    launcherWorker.getAnalysisResultsObservable().subscribe(onAnalysisResult, onError, onComplete),
  ]

  try {
    // Run the launcher worker
    await launcherWorker.goWorker(numThreads, params, qryFastaStr)
  } finally {
    // Unsubscribe from all events
    await concurrent.forEach(async (subscription) => subscription.unsubscribe(), subscriptions)
  }
}

async function getQueryFasta(input: AlgorithmInput | undefined) {
  // If sequence data is provided explicitly, load it
  if (input) {
    return input.getContent()
  }
  throw new Error('Sequence fasta data is not available, but required')
}

/** Typed output of Object.entries(), assuming all fields have the same type */
type Entry<T, V> = [keyof T, V]

/** Resolves all param inputs into strings */
async function getParams(paramInputs: LaunchAnalysisInputs, dataset: DatasetFlat): Promise<NextcladeParamsPojo> {
  const paramInputsEntries = Object.entries(paramInputs) as Entry<LaunchAnalysisInputs, AlgorithmInput>[]

  return Object.fromEntries(
    await concurrent.map(
      async ([key, input]: Entry<LaunchAnalysisInputs, AlgorithmInput>): Promise<
        Entry<NextcladeParamsPojo, string>
      > => {
        const datasetKey = DATASET_FILE_NAME_MAPPING[key]
        const content = await resolveInput(input, dataset.files[datasetKey])
        return [key as keyof NextcladeParamsPojo, content]
      },
      paramInputsEntries,
    ),
  ) as unknown as NextcladeParamsPojo
}

async function resolveInput(input: AlgorithmInput | undefined, datasetFileUrl: string) {
  // If data is provided explicitly, load it
  if (input) {
    return input.getContent()
  }
  // Otherwise fetch corresponding file from the dataset
  return axiosFetchRaw(datasetFileUrl)
}
