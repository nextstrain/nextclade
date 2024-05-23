import { concurrent } from 'fasy'
import { isEmpty, merge } from 'lodash'
import type {
  AlgorithmInput,
  FastaRecordId,
  NextcladeResult,
  CsvColumnConfig,
  NextcladeParamsRaw,
  AnalysisInitialData,
  OutputTrees,
} from 'src/types'
import { AlgorithmGlobalStatus } from 'src/types'
import type { LauncherThread } from 'src/workers/launcher.worker'
import { spawn } from 'src/workers/spawn'

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
  params: NextcladeParamsRaw,
  callbacks: LaunchAnalysisCallbacks,
  numThreads: Promise<number>,
  csvColumnConfigPromise: Promise<CsvColumnConfig | undefined>,
) {
  const { onGlobalStatus, onInitialData, onParsedFasta, onAnalysisResult, onTree, onError, onComplete } = callbacks

  // Resolve inputs into the actual strings
  const qryFastaStr = await getQueryFasta(await qryFastaInputs)

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
