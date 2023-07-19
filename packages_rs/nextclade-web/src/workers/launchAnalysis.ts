import { concurrent } from 'fasy'
import type { AuspiceJsonV2 } from 'auspice'
import { isEmpty, merge } from 'lodash'

import type {
  AlgorithmInput,
  Dataset,
  FastaRecordId,
  NextcladeResult,
  CsvColumnConfig,
  NextcladeParams,
  NextcladeParamsRaw,
  AnalysisInitialData,
} from 'src/types'
import { AlgorithmGlobalStatus } from 'src/types'
import { ErrorInternal } from 'src/helpers/ErrorInternal'
import type { LauncherThread } from 'src/workers/launcher.worker'
import { spawn } from 'src/workers/spawn'
import { axiosFetchRaw } from 'src/io/axiosFetch'

export interface LaunchAnalysisInputs {
  refSeq: Promise<AlgorithmInput | undefined>
  geneMap: Promise<AlgorithmInput | undefined>
  tree: Promise<AlgorithmInput | undefined>
  qcConfig: Promise<AlgorithmInput | undefined>
  virusProperties: Promise<AlgorithmInput | undefined>
}

export interface LaunchAnalysisCallbacks {
  onGlobalStatus: (record: AlgorithmGlobalStatus) => void
  onInitialData: (data: AnalysisInitialData) => void
  onParsedFasta: (record: FastaRecordId) => void
  onAnalysisResult: (record: NextcladeResult) => void
  onTree: (tree: AuspiceJsonV2) => void
  onError: (error: Error) => void
  onComplete: () => void
}

/** Maps input field names to the dataset field names, so that we know which one to take */
const DATASET_FILE_NAME_MAPPING: Record<keyof LaunchAnalysisInputs, string> = {
  refSeq: 'reference.fasta',
  geneMap: 'genemap.gff',
  tree: 'tree.json',
  qcConfig: 'qc.json',
  virusProperties: 'virus_properties.json',
}

export async function launchAnalysis(
  qryFastaInputs: Promise<AlgorithmInput[]>,
  paramInputs: LaunchAnalysisInputs,
  callbacks: LaunchAnalysisCallbacks,
  datasetPromise: Promise<Dataset | undefined>,
  numThreads: Promise<number>,
  csvColumnConfigPromise: Promise<CsvColumnConfig | undefined>,
) {
  const { onGlobalStatus, onInitialData, onParsedFasta, onAnalysisResult, onTree, onError, onComplete } = callbacks

  // Resolve inputs into the actual strings
  const qryFastaStr = await getQueryFasta(await qryFastaInputs)

  const [dataset] = await Promise.all([datasetPromise])
  if (!dataset) {
    throw new ErrorInternal('Dataset is required but not found')
  }

  const params = await getParams(paramInputs, dataset)

  const csvColumnConfig = await csvColumnConfigPromise

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

      initialData.csvColumnConfigDefault = merge(initialData.csvColumnConfigDefault, csvColumnConfig)

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

async function getQueryFasta(inputs: AlgorithmInput[]) {
  if (isEmpty(inputs)) {
    throw new Error('Sequence fasta data is not available, but required')
  }

  const contents = await concurrent.map(async (input) => input.getContent(), inputs)
  return contents.join('\n')
}

/** Typed output of Object.entries(), assuming all fields have the same type */
type Entry<T, V> = [keyof T, V]

type LaunchAnalysisInputsEntry = Entry<LaunchAnalysisInputs, Promise<AlgorithmInput | undefined>>

/** Resolves all param inputs into strings */
async function getParams(paramInputs: LaunchAnalysisInputs, dataset: Dataset): Promise<NextcladeParamsRaw> {
  const paramInputsEntries = Object.entries(paramInputs) as LaunchAnalysisInputsEntry[]

  return Object.fromEntries(
    await concurrent.map(async ([key, input]: LaunchAnalysisInputsEntry): Promise<Entry<NextcladeParams, string>> => {
      const datasetKey = DATASET_FILE_NAME_MAPPING[key]
      const content = await resolveInput(await input, dataset.files[datasetKey])
      return [key as keyof NextcladeParams, content]
    }, paramInputsEntries),
  ) as unknown as NextcladeParamsRaw
}

async function resolveInput(input: AlgorithmInput | undefined, datasetFileUrl: string) {
  // If data is provided explicitly, load it
  if (input) {
    return input.getContent()
  }
  // Otherwise fetch corresponding file from the dataset
  return axiosFetchRaw(datasetFileUrl)
}
