import { concurrent } from 'fasy'
import { isEmpty, merge } from 'lodash'
import type {
  AlgorithmInput,
  Dataset,
  FastaRecordId,
  NextcladeResult,
  CsvColumnConfig,
  NextcladeParamsRaw,
  AnalysisInitialData,
  OutputTrees,
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
  virusProperties: Promise<AlgorithmInput | undefined>
}

export interface LaunchAnalysisCallbacks {
  onGlobalStatus: (record: AlgorithmGlobalStatus) => void
  onInitialData: (data: AnalysisInitialData) => void
  onParsedFasta: (record: FastaRecordId) => void
  onAnalysisResult: (record: NextcladeResult) => void
  onTree: (trees: OutputTrees) => void
  onError: (error: Error) => void
  onComplete: () => void
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

export async function getQueryFasta(inputs: AlgorithmInput[]) {
  if (isEmpty(inputs)) {
    throw new Error('Sequence fasta data is not available, but required')
  }

  const contents = await concurrent.map(async (input) => input.getContent(), inputs)
  return contents.join('\n')
}

/** Resolves all param inputs into strings */
async function getParams(paramInputs: LaunchAnalysisInputs, dataset: Dataset): Promise<NextcladeParamsRaw> {
  const entries = [
    { key: 'geneMap', input: paramInputs.geneMap, datasetFileUrl: dataset.files.genomeAnnotation },
    { key: 'refSeq', input: paramInputs.refSeq, datasetFileUrl: dataset.files.reference },
    { key: 'tree', input: paramInputs.tree, datasetFileUrl: dataset.files.treeJson },
    { key: 'virusProperties', input: paramInputs.virusProperties, datasetFileUrl: dataset.files.pathogenJson },
  ]

  return Object.fromEntries(
    await concurrent.map(async ({ key, input, datasetFileUrl }) => {
      return [key, await resolveInput(await input, datasetFileUrl)]
    }, entries),
  ) as unknown as NextcladeParamsRaw
}

async function resolveInput(input: AlgorithmInput | undefined, datasetFileUrl: string | undefined) {
  // If data is provided explicitly, load it
  if (input) {
    return input.getContent()
  }

  // Otherwise fetch corresponding file from the dataset
  if (datasetFileUrl) {
    return axiosFetchRaw(datasetFileUrl)
  }

  return undefined
}
