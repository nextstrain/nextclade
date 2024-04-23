import { first, get, isNil, mean, sortBy, uniq } from 'lodash'
import type { Subscription } from 'observable-fns'
import { useMemo } from 'react'
import { useRecoilCallback, useRecoilValue } from 'recoil'
import { ErrorInternal } from 'src/helpers/ErrorInternal'
import { axiosFetch } from 'src/io/axiosFetch'
import {
  autodetectResultByIndexAtom,
  autodetectResultsAtom,
  AutodetectRunState,
  autodetectRunStateAtom,
  autodetectShouldSetCurrentDatasetAtom,
  minimizerIndexAtom,
} from 'src/state/autodetect.state'
import { datasetsAtom, minimizerIndexVersionAtom } from 'src/state/dataset.state'
import { globalErrorAtom } from 'src/state/error.state'
import { qrySeqInputsStorageAtom } from 'src/state/inputs.state'
import type { Dataset, MinimizerIndexJson, MinimizerSearchRecord } from 'src/types'
import { getQueryFasta } from 'src/workers/launchAnalysis'
import { NextcladeSeqAutodetectWasmWorker } from 'src/workers/nextcladeAutodetect.worker'
import { spawn } from 'src/workers/spawn'

export interface AutosuggestionParams {
  shouldSetCurrentDataset?: boolean
}

export function useRunSeqAutodetect(params?: AutosuggestionParams) {
  return useRecoilCallback(
    ({ set, reset, snapshot }) =>
      () => {
        const { getPromise } = snapshot

        reset(minimizerIndexAtom)
        reset(autodetectResultsAtom)
        reset(autodetectRunStateAtom)
        reset(autodetectShouldSetCurrentDatasetAtom)

        function onResult(results: MinimizerSearchRecord[]) {
          results.forEach((res) => {
            set(autodetectResultByIndexAtom(res.fastaRecord.index), res)
          })
        }

        function onError(error: Error) {
          set(autodetectRunStateAtom, AutodetectRunState.Failed)
          set(globalErrorAtom, error)
        }

        function onComplete() {
          set(autodetectRunStateAtom, AutodetectRunState.Done)
          set(autodetectShouldSetCurrentDatasetAtom, params?.shouldSetCurrentDataset ?? false)
        }

        set(autodetectRunStateAtom, AutodetectRunState.Started)

        Promise.all([getPromise(qrySeqInputsStorageAtom), getPromise(minimizerIndexVersionAtom)])
          .then(async ([qrySeqInputs, minimizerIndexVersion]) => {
            if (!minimizerIndexVersion) {
              throw new ErrorInternal('Tried to run minimizer search without minimizer index available')
            }
            const fasta = await getQueryFasta(qrySeqInputs)
            const minimizerIndex: MinimizerIndexJson = await axiosFetch(minimizerIndexVersion.path)
            set(minimizerIndexAtom, minimizerIndex)
            return runAutodetect(fasta, minimizerIndex, { onResult, onError, onComplete })
          })
          .catch((error) => {
            throw error
          })
      },
    [params?.shouldSetCurrentDataset],
  )
}

interface Callbacks {
  onResult: (r: MinimizerSearchRecord[]) => void
  onError?: (error: Error) => void
  onComplete?: () => void
}

async function runAutodetect(fasta: string, minimizerIndex: MinimizerIndexJson, callbacks: Callbacks) {
  const worker = await SeqAutodetectWasmWorker.create(minimizerIndex)
  await worker.autodetect(fasta, callbacks)
  await worker.destroy()
}

export class SeqAutodetectWasmWorker {
  private thread!: NextcladeSeqAutodetectWasmWorker
  private subscription?: Subscription<MinimizerSearchRecord[]>

  private constructor() {}

  static async create(minimizerIndex: MinimizerIndexJson) {
    const self = new SeqAutodetectWasmWorker()
    await self.init(minimizerIndex)
    return self
  }

  async init(minimizerIndex: MinimizerIndexJson) {
    this.thread = await spawn<NextcladeSeqAutodetectWasmWorker>(
      new Worker(new URL('src/workers/nextcladeAutodetect.worker.ts', import.meta.url), {
        name: 'nextcladeAutodetectWorker',
      }),
    )

    await this.thread.create(minimizerIndex)
  }

  async autodetect(fastaStr: string, { onResult, onError, onComplete }: Callbacks) {
    this.subscription = this.thread.values().subscribe(onResult, onError, onComplete)
    await this.thread.autodetect(fastaStr)
  }

  async destroy() {
    this.subscription?.unsubscribe()
    await this.thread.destroy()
  }
}

export function groupByDatasets(records: MinimizerSearchRecord[]) {
  const names = uniq(records.flatMap((record) => record.result.datasets.map((dataset) => dataset.name)))
  let byDataset: Record<string, { records: MinimizerSearchRecord[]; meanScore: number }> = {}
  // eslint-disable-next-line no-loops/no-loops
  for (const name of names) {
    // Find sequence records which match this dataset
    const selectedRecords = records.filter((record) => record.result.datasets.some((dataset) => dataset.name === name))

    // Get scores for sequence records which match this dataset
    const scores = selectedRecords.map((record) => {
      const dataset = record.result.datasets.find((ds) => ds.name === name)
      return dataset?.score ?? 0
    })
    const meanScore = mean(scores)

    byDataset = { ...byDataset, [name]: { records: selectedRecords, meanScore } }
  }
  return byDataset
}

export function useDatasetSuggestionResults() {
  const { datasets } = useRecoilValue(datasetsAtom)
  const autodetectResults = useRecoilValue(autodetectResultsAtom)
  return useMemo(() => processSuggestionResults(datasets, autodetectResults), [autodetectResults, datasets])
}

export function processSuggestionResults(datasets: Dataset[], autodetectResults: MinimizerSearchRecord[] | undefined) {
  if (isNil(autodetectResults) || autodetectResults.length === 0) {
    return {
      datasetsActive: datasets,
      datasetsInactive: [],
      topSuggestion: undefined,
      showSuggestions: false,
      numSuggestions: datasets.length,
    }
  }

  const recordsByDataset = groupByDatasets(autodetectResults)

  let itemsInclude = datasets.filter((candidate) =>
    Object.entries(recordsByDataset).some(([dataset, _]) => dataset === candidate.path),
  )

  itemsInclude = sortBy(itemsInclude, (dataset) => {
    const record = get(recordsByDataset, dataset.path)
    return -record.meanScore
  })

  itemsInclude = sortBy(itemsInclude, (dataset) => -(get(recordsByDataset, dataset.path)?.records?.length ?? 0))

  const itemsNotInclude = datasets.filter((candidate) => !itemsInclude.map((it) => it.path).includes(candidate.path))

  const showSuggestions = !isNil(autodetectResults) && autodetectResults.length > 0

  const datasetsActive = itemsInclude
  const datasetsInactive = itemsNotInclude
  const topSuggestion = first(datasetsActive)
  const numSuggestions = datasetsActive.length

  return { datasetsActive, datasetsInactive, topSuggestion, showSuggestions, numSuggestions }
}
