import { concurrent } from 'fasy'
import type { AuspiceJsonV2, CladeNodeAttrDesc } from 'auspice'
import { AlgorithmGlobalStatus } from 'src/algorithms/types'

import type {
  AlgorithmInput,
  DatasetFiles,
  DatasetFlat,
  FastaRecordId,
  Gene,
  NextcladeResult,
} from 'src/algorithms/types'
import type { NextcladeParamsPojo } from 'src/gen'
import { ErrorInternal } from 'src/helpers/ErrorInternal'
import type { LauncherThread } from 'src/workers/launcher.worker'
import { spawn } from 'src/workers/spawn'
import { axiosFetchRaw } from 'src/io/axiosFetch'

export interface LaunchAnalysisInputs {
  ref_seq_str: Promise<AlgorithmInput | undefined>
  gene_map_str: Promise<AlgorithmInput | undefined>
  tree_str: Promise<AlgorithmInput | undefined>
  qc_config_str: Promise<AlgorithmInput | undefined>
  virus_properties_str: Promise<AlgorithmInput | undefined>
  pcr_primers_str: Promise<AlgorithmInput | undefined>
}

export interface LaunchAnalysisInitialData {
  geneMap: Gene[]
  genomeSize: number
  cladeNodeAttrKeyDescs: CladeNodeAttrDesc[]
}

export interface LaunchAnalysisCallbacks {
  onGlobalStatus: (record: AlgorithmGlobalStatus) => void
  onInitialData: (data: LaunchAnalysisInitialData) => void
  onParsedFasta: (record: FastaRecordId) => void
  onAnalysisResult: (record: NextcladeResult) => void
  onTree: (tree: AuspiceJsonV2) => void
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
  datasetPromise: Promise<DatasetFlat | undefined>,
  numThreads: Promise<number>,
) {
  const { onGlobalStatus, onInitialData, onParsedFasta, onAnalysisResult, onTree, onError, onComplete } = callbacks

  // Resolve inputs into the actual strings
  const qryFastaStr = await getQueryFasta(await qryFastaInput)

  const dataset = await datasetPromise
  if (!dataset) {
    throw new ErrorInternal('Dataset is required but not found')
  }

  const params = await getParams(paramInputs, dataset)

  const launcherWorker = await spawn<LauncherThread>(
    new Worker(new URL('src/workers/launcher.worker.ts', import.meta.url), { name: 'launcherWebWorker' }),
  )

  try {
    await launcherWorker.init(await numThreads, params)

    // Subscribe to launcher worker events
    const subscriptions = [
      launcherWorker.getAnalysisGlobalStatusObservable().subscribe(onGlobalStatus, onError),
      launcherWorker.getParsedFastaObservable().subscribe(onParsedFasta, onError),
      launcherWorker.getAnalysisResultsObservable().subscribe(onAnalysisResult, onError, onComplete),
      launcherWorker.getTreeObservable().subscribe(onTree, onError),
    ]

    try {
      const initialData = await launcherWorker.getInitialData()
      onInitialData(initialData)

      // Run the launcher worker
      await launcherWorker.launch(qryFastaStr)
    } finally {
      // Unsubscribe from all events
      await concurrent.forEach(async (subscription) => subscription.unsubscribe(), subscriptions)
    }
  } finally {
    await launcherWorker.destroy()
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

type LaunchAnalysisInputsEntry = Entry<LaunchAnalysisInputs, Promise<AlgorithmInput | undefined>>

/** Resolves all param inputs into strings */
async function getParams(paramInputs: LaunchAnalysisInputs, dataset: DatasetFlat): Promise<NextcladeParamsPojo> {
  const paramInputsEntries = Object.entries(paramInputs) as LaunchAnalysisInputsEntry[]

  return Object.fromEntries(
    await concurrent.map(
      async ([key, input]: LaunchAnalysisInputsEntry): Promise<Entry<NextcladeParamsPojo, string>> => {
        const datasetKey = DATASET_FILE_NAME_MAPPING[key]
        const content = await resolveInput(await input, dataset.files[datasetKey])
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
