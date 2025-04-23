import { concurrent } from 'fasy'
import { isEmpty, merge } from 'lodash'
import type {
  AlgorithmInput,
  NextcladeResult,
  CsvColumnConfig,
  NextcladeParamsRaw,
  AnalysisInitialData,
  OutputTrees,
} from 'src/types'
import { AlgorithmGlobalStatus } from 'src/types'
import type { LauncherThread } from 'src/workers/launcher.worker'
import { spawn } from 'src/workers/spawn'

export interface DatasetFilesOverrides {
  reference: Promise<AlgorithmInput | undefined>
  genomeAnnotation: Promise<AlgorithmInput | undefined>
  treeJson: Promise<AlgorithmInput | undefined>
  pathogenJson: Promise<AlgorithmInput | undefined>
}

export interface LaunchAnalysisCallbacks {
  onGlobalStatus: (record: AlgorithmGlobalStatus) => void
  onInitialData: (datasetName: string, data: AnalysisInitialData) => void
  onAnalysisResult: (record: NextcladeResult) => void
  onTree: (trees: Record<string, OutputTrees | undefined | null>) => void
  onError: (error: Error) => void
  onComplete: () => void
}

export async function launchAnalysis(
  datasetNames: string[],
  seqIndexToTopDatasetName: Map<number, string> | undefined,
  seqIndicesWithoutDatasetSuggestions: number[] | undefined,
  qryFastaInputs: AlgorithmInput[],
  params: NextcladeParamsRaw,
  callbacks: LaunchAnalysisCallbacks,
  numThreads: number,
  csvColumnConfigPromise: Promise<CsvColumnConfig | undefined>,
) {
  const { onGlobalStatus, onInitialData, onAnalysisResult, onTree, onError, onComplete } = callbacks

  // Resolve inputs into the actual strings
  const qryFastaStr = await getQueryFasta(qryFastaInputs)

  const csvColumnConfig = await csvColumnConfigPromise

  const launcherWorker = await spawn<LauncherThread>(
    new Worker(new URL('src/workers/launcher.worker.ts', import.meta.url), { name: 'launcherWebWorker' }),
  )

  try {
    await launcherWorker.init(
      numThreads,
      datasetNames,
      seqIndexToTopDatasetName,
      seqIndicesWithoutDatasetSuggestions,
      params,
    )

    // Subscribe to launcher worker events
    const subscriptions = [
      launcherWorker.getAnalysisGlobalStatusObservable().subscribe(onGlobalStatus, onError),
      launcherWorker.getAnalysisResultsObservable().subscribe(onAnalysisResult, onError, onComplete),
      launcherWorker.getTreeObservable().subscribe(onTree, onError),
    ]

    try {
      await concurrent.forEach(async (datasetName) => {
        const initialData = await launcherWorker.getInitialData(datasetName)
        initialData.csvColumnConfigDefault = merge(initialData.csvColumnConfigDefault, csvColumnConfig)
        onInitialData(datasetName, initialData)
      }, datasetNames)

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
