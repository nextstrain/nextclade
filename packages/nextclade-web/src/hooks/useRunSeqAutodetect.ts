import { isNil } from 'lodash'
import type { Subscription } from 'observable-fns'
import { useCallback } from 'react'
import { useRecoilCallback } from 'recoil'
import { ErrorInternal } from 'src/helpers/ErrorInternal'
import { sanitizeError } from 'src/helpers/sanitizeError'
import { axiosFetch } from 'src/io/axiosFetch'
import { fetchDatasetsIndex } from 'src/io/fetchDatasetsIndex'
import {
  AutodetectRunState,
  allDatasetSuggestionResultsAtom,
  autodetectResultByIndexAtom,
  autodetectResultsAtom,
  autodetectRunStateAtom,
  autodetectShouldSetCurrentDatasetAtom,
  minimizerIndexAtom,
  autodetectErrorAtom,
} from 'src/state/autodetect.state'
import { datasetServerUrlAtom, minimizerIndexVersionAtom, viewedDatasetNameAtom } from 'src/state/dataset.state'
import { qrySeqInputsStorageAtom } from 'src/state/inputs.state'
import { DatasetsIndexJson, FindBestDatasetsResult, MinimizerIndexJson, MinimizerSearchRecord } from 'src/types'
import { getQueryFasta } from 'src/workers/launchAnalysis'
import { NextcladeSeqAutodetectWasmWorker } from 'src/workers/nextcladeAutodetect.worker'
import { spawn } from 'src/workers/spawn'

export interface AutosuggestionParams {
  shouldSetCurrentDataset?: boolean
}

export function useRunSeqAutodetect(params?: AutosuggestionParams) {
  const suggestAsync = useRunSeqAutodetectAsync(params)
  return useCallback(() => {
    void suggestAsync() // eslint-disable-line no-void
  }, [suggestAsync])
}

export function useRunSeqAutodetectAsync(params?: AutosuggestionParams) {
  return useRecoilCallback(
    ({ set, reset, snapshot }) =>
      async () => {
        const snapshotRelease = snapshot.retain()
        const { getPromise } = snapshot

        const datasetServerUrl = await getPromise(datasetServerUrlAtom)
        if (isNil(datasetServerUrl)) {
          snapshotRelease()
          return undefined
        }

        reset(minimizerIndexAtom)
        reset(autodetectResultsAtom)
        reset(autodetectRunStateAtom)
        reset(autodetectErrorAtom)
        reset(autodetectShouldSetCurrentDatasetAtom)
        reset(allDatasetSuggestionResultsAtom)
        reset(viewedDatasetNameAtom)

        function onResult(results: MinimizerSearchRecord[]) {
          results.forEach((res) => {
            set(autodetectResultByIndexAtom(res.fastaRecord.index), res)
          })
        }

        function onError(error: Error) {
          set(autodetectRunStateAtom, AutodetectRunState.Failed)
          set(autodetectErrorAtom, error)
        }

        function onComplete() {
          set(autodetectRunStateAtom, AutodetectRunState.Done)
          reset(autodetectErrorAtom)
          set(autodetectShouldSetCurrentDatasetAtom, params?.shouldSetCurrentDataset ?? false)
        }

        function onBestResults(results: FindBestDatasetsResult) {
          set(allDatasetSuggestionResultsAtom, results)
          set(viewedDatasetNameAtom, results.suggestions[0]?.name)
        }

        set(autodetectRunStateAtom, AutodetectRunState.Started)

        return Promise.all([getPromise(qrySeqInputsStorageAtom), getPromise(minimizerIndexVersionAtom)])
          .then(async ([qrySeqInputs, minimizerIndexVersion]) => {
            if (!minimizerIndexVersion) {
              throw new ErrorInternal('Tried to run minimizer search without minimizer index available')
            }
            const fasta = await getQueryFasta(qrySeqInputs)
            const minimizerIndex: MinimizerIndexJson = await axiosFetch(minimizerIndexVersion.path)
            set(minimizerIndexAtom, minimizerIndex)

            const index = await fetchDatasetsIndex(datasetServerUrl)

            return runAutodetect(fasta, index, minimizerIndex, {
              onResult,
              onError,
              onComplete,
              onBestResults,
            })
          })
          .catch((error: unknown) => {
            onError(sanitizeError(error))
            throw error
          })
          .finally(() => {
            snapshotRelease()
          })
      },
    [params?.shouldSetCurrentDataset],
  )
}

interface Callbacks {
  onResult: (r: MinimizerSearchRecord[]) => void
  onError?: (error: Error) => void
  onComplete?: () => void
  onBestResults?: (result: FindBestDatasetsResult) => void
}

async function runAutodetect(
  fasta: string,
  index: DatasetsIndexJson,
  minimizerIndex: MinimizerIndexJson,
  callbacks: Callbacks,
): Promise<FindBestDatasetsResult> {
  const worker = await SeqAutodetectWasmWorker.create(index, minimizerIndex)
  const bestResults = await worker.autodetect(fasta, callbacks)
  await worker.destroy()
  return bestResults
}

export class SeqAutodetectWasmWorker {
  private thread!: NextcladeSeqAutodetectWasmWorker
  private subscription?: Subscription<MinimizerSearchRecord[]>

  private constructor() {}

  static async create(index: DatasetsIndexJson, minimizerIndex: MinimizerIndexJson) {
    const self = new SeqAutodetectWasmWorker()
    await self.init(index, minimizerIndex)
    return self
  }

  async init(index: DatasetsIndexJson, minimizerIndex: MinimizerIndexJson) {
    this.thread = await spawn<NextcladeSeqAutodetectWasmWorker>(
      new Worker(new URL('src/workers/nextcladeAutodetect.worker.ts', import.meta.url), {
        name: 'src/workers/nextcladeAutodetect.worker.ts',
      }),
    )

    await this.thread.create(index, minimizerIndex)
  }

  async autodetect(
    fastaStr: string,
    { onResult, onError, onComplete, onBestResults }: Callbacks,
  ): Promise<FindBestDatasetsResult> {
    this.subscription = this.thread.values().subscribe(onResult, onError, onComplete)
    await this.thread.autodetect(fastaStr)
    const result = await this.thread.findBestDatasets()
    onBestResults?.(result)
    return result
  }

  async destroy() {
    this.subscription?.unsubscribe()
    await this.thread.destroy()
  }
}
