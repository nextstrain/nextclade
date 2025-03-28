import { first, get, isEmpty, isNil, mean, sortBy, uniq } from 'lodash'
import type { Subscription } from 'observable-fns'
import { useMemo } from 'react'
import { useRecoilCallback, useRecoilValue } from 'recoil'
import { ErrorInternal } from 'src/helpers/ErrorInternal'
import { notUndefinedOrNull } from 'src/helpers/notUndefined'
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
import type { Dataset, FastaRecord, MinimizerIndexJson, MinimizerSearchRecord } from 'src/types'
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

export interface MinimizerSearchRecordGroup {
  records: MinimizerSearchRecord[]
  meanScore: number
}

export interface DatasetScored {
  dataset: Dataset
  length: number
  nHits: number
  score: number
}

export interface DatasetSuggestionResult {
  fastaRecord: FastaRecord
  datasets: DatasetScored[]
  maxScore: number
  totalHits: number
}

export function mapDatasetToSeqs(records: MinimizerSearchRecord[]): Record<string, MinimizerSearchRecordGroup> {
  const names = uniq(records.flatMap((record) => record.result.datasets.map((dataset) => dataset.name)))
  let byDataset: Record<string, MinimizerSearchRecordGroup> = {}
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

/** Convert raw minimizer search results into a more convenient form */
export function convertSuggestionResults(
  datasets: Dataset[],
  records: MinimizerSearchRecord[],
): DatasetSuggestionResult[] {
  return records.map((record) => {
    const datasetsScored = record.result.datasets.map((resultDataset) => {
      const dataset = datasets.find((dataset) => resultDataset.name === dataset.path)
      if (!dataset) {
        throw new ErrorInternal(`Unable to find dataset by name: '${resultDataset.name}'`)
      }
      return {
        dataset,
        length: resultDataset.length,
        nHits: resultDataset.nHits,
        score: resultDataset.score,
      }
    })
    return {
      fastaRecord: record.fastaRecord,
      datasets: datasetsScored,
      maxScore: record.result.maxScore,
      totalHits: record.result.totalHits,
    }
  })
}

/** Map sequence index to a list of suggested datasets (sorted by score) */
export function mapSeqToDatasets(records: DatasetSuggestionResult[]): Map<number, DatasetScored[]> {
  return new Map(
    records.map((record) => [record.fastaRecord.index, sortBy(record.datasets, (dataset) => -dataset.score)]),
  )
}

/** Map sequence index to a top suggested dataset */
export function mapSeqToTopDataset(
  seqToDatasets: Map<number, DatasetScored[]>,
): Map<number, DatasetScored | undefined> {
  return new Map(Array.from(seqToDatasets, ([seqIndex, datasets]) => [seqIndex, datasets[0]]))
}

export function useDatasetSuggestionResults() {
  const datasets = useRecoilValue(datasetsAtom)
  const autodetectResults = useRecoilValue(autodetectResultsAtom)
  return useMemo(() => processSuggestionResults(datasets, autodetectResults), [autodetectResults, datasets])
}

export interface SuggestionResultsGrouped {
  datasetsActive: Dataset[]
  datasetsInactive: Dataset[]
  topSuggestion?: Dataset
  showSuggestions: boolean
  numSuggestions: number
  autodetectResults: MinimizerSearchRecord[] | undefined
  suggestionResults: DatasetSuggestionResult[] | undefined
  datasetToSeqs: Record<string, MinimizerSearchRecordGroup>
  datasetNameToSeqIndices: Map<string, number[]>
  seqToDatasets: Map<number, DatasetScored[]>
  seqToTopDataset: Map<number, DatasetScored | undefined>
  seqIndexToTopDatasetName: Map<number, string | undefined>
  topDatasets: Dataset[]
  topDatasetNames: string[]
}

export function processSuggestionResults(
  datasets: Dataset[],
  autodetectResults: MinimizerSearchRecord[] | undefined,
): SuggestionResultsGrouped {
  if (isNil(autodetectResults) || isEmpty(autodetectResults)) {
    return {
      datasetsActive: datasets,
      datasetsInactive: [],
      topSuggestion: undefined,
      showSuggestions: false,
      numSuggestions: datasets.length,
      autodetectResults: undefined,
      suggestionResults: undefined,
      datasetToSeqs: {},
      datasetNameToSeqIndices: new Map(),
      seqToDatasets: new Map(),
      seqToTopDataset: new Map(),
      seqIndexToTopDatasetName: new Map(),
      topDatasets: [],
      topDatasetNames: [],
    }
  }

  const suggestionResults = convertSuggestionResults(datasets, autodetectResults)
  const seqToDatasets = mapSeqToDatasets(suggestionResults)
  const seqToTopDataset = mapSeqToTopDataset(seqToDatasets)

  const seqIndexToTopDatasetName = new Map(
    Array.from(seqToTopDataset.entries(), ([seqIndex, dataset]) => [seqIndex, dataset?.dataset.path]),
  )

  const topDatasetNames = uniq(
    Array.from(seqToTopDataset.values(), (dataset) => dataset?.dataset.path)
      .filter(notUndefinedOrNull)
      .sort(),
  )

  const topDatasets = topDatasetNames
    .map((name) => datasets.find((dataset) => dataset.path === name))
    .filter(notUndefinedOrNull)

  const datasetToSeqs = mapDatasetToSeqs(autodetectResults)
  const datasetNameToSeqIndices = new Map(
    Object.entries(datasetToSeqs).map(([datasetName, records]) => {
      const seqIndices = records.records.map((record) => record.fastaRecord.index)
      return [datasetName, seqIndices]
    }),
  )

  let itemsInclude = datasets.filter((candidate) =>
    Object.entries(datasetToSeqs).some(([dataset, _]) => dataset === candidate.path),
  )

  itemsInclude = sortBy(itemsInclude, (dataset) => {
    const record = get(datasetToSeqs, dataset.path)
    return -record.meanScore
  })

  itemsInclude = sortBy(itemsInclude, (dataset) => -(get(datasetToSeqs, dataset.path)?.records?.length ?? 0))

  const itemsNotInclude = datasets.filter((candidate) => !itemsInclude.map((it) => it.path).includes(candidate.path))

  const showSuggestions = !isNil(autodetectResults) && autodetectResults.length > 0

  const datasetsActive = itemsInclude
  const datasetsInactive = itemsNotInclude
  const topSuggestion = first(datasetsActive)
  const numSuggestions = datasetsActive.length

  return {
    datasetsActive,
    datasetsInactive,
    topSuggestion,
    showSuggestions,
    numSuggestions,
    autodetectResults,
    suggestionResults,
    datasetToSeqs,
    datasetNameToSeqIndices,
    seqToDatasets,
    seqToTopDataset,
    seqIndexToTopDatasetName,
    topDatasets,
    topDatasetNames,
  }
}
