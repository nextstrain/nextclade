import type { Subscription } from 'observable-fns'
import { useCallback, useReducer, useRef } from 'react'
import { useRecoilCallback, useRecoilValue } from 'recoil'
import { ErrorInternal } from 'src/helpers/ErrorInternal'
import { axiosFetch } from 'src/io/axiosFetch'
import {
  AutodetectRunState,
  allDatasetSuggestionResultsAtom,
  autodetectResultByIndexAtom,
  autodetectResultsAtom,
  autodetectRunStateAtom,
  autodetectShouldSetCurrentDatasetAtom,
  minimizerIndexAtom,
  datasetNameToSeqIndicesAtom,
  seqIndexToTopDatasetNameAtom,
  seqIndicesWithoutDatasetSuggestionsAtom,
} from 'src/state/autodetect.state'
import { minimizerIndexVersionAtom, viewedDatasetNameAtom } from 'src/state/dataset.state'
import { globalErrorAtom } from 'src/state/error.state'
import { qrySeqInputsStorageAtom } from 'src/state/inputs.state'
import type { FindBestDatasetsResult, MinimizerIndexJson, MinimizerSearchRecord } from 'src/types'
import { getQueryFasta } from 'src/workers/launchAnalysis'
import { NextcladeSeqAutodetectWasmWorker } from 'src/workers/nextcladeAutodetect.worker'
import { spawn } from 'src/workers/spawn'
import { Thread } from 'threads'

export interface AutosuggestionParams {
  shouldSetCurrentDataset?: boolean
}

export function useRunSeqAutodetect(params?: AutosuggestionParams) {
  const workerRef = useRef<SeqAutodetectWasmWorker>()
  const locked = useRef(false)
  const [, forceRender] = useReducer((x: number) => x + 1, 0)

  const stop = useCallback(() => {
    if (!workerRef.current || !locked.current) {
      console.log({ '!workerRef.current': !workerRef.current, '!locked.current': !locked.current })
      return
    }
    locked.current = true
    // forceRender()

    // eslint-disable-next-line promise/catch-or-return
    workerRef.current
      .terminate()
      .catch((error) => {
        throw error
      })
      .finally(() => {
        console.log('finally')
        workerRef.current = undefined
        locked.current = false
        forceRender()
      })
  }, [])

  const run = useRecoilCallback(
    ({ set, reset, snapshot }) =>
      function run() {
        if (locked.current) {
          return
        }
        locked.current = true
        forceRender()

        const { getPromise } = snapshot

        reset(minimizerIndexAtom)
        reset(autodetectResultsAtom)
        reset(autodetectRunStateAtom)
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
          set(globalErrorAtom, error)
        }

        function onComplete() {
          set(autodetectRunStateAtom, AutodetectRunState.Done)
          set(autodetectShouldSetCurrentDatasetAtom, params?.shouldSetCurrentDataset ?? false)
        }

        function onBestResults(results: FindBestDatasetsResult) {
          set(allDatasetSuggestionResultsAtom, results)
          set(viewedDatasetNameAtom, results.suggestions[0]?.name)
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

            workerRef.current = await SeqAutodetectWasmWorker.create(minimizerIndex)
            await workerRef.current.autodetect(fasta, { onResult, onBestResults, onComplete, onError })
            stop()

            return undefined
          })
          .catch((error) => {
            throw error
          })
      },
    [params?.shouldSetCurrentDataset, stop],
  )

  return { run, stop, isRunning: locked.current ?? false }
}

interface Callbacks {
  onResult: (r: MinimizerSearchRecord[]) => void
  onError?: (error: Error) => void
  onComplete?: () => void
  onBestResults?: (result: FindBestDatasetsResult) => void
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

  async autodetect(fastaStr: string, { onResult, onError, onComplete, onBestResults }: Callbacks) {
    this.subscription = this.thread.values().subscribe(onResult, onError, onComplete)
    await this.thread.autodetect(fastaStr)
    await this.thread.findBestDatasets().then((result) => onBestResults?.(result))
  }

  async terminate() {
    console.log('terminate')
    await Thread.terminate(this.thread)
    // this.subscription?.unsubscribe()
    // await this.thread.destroy()
  }
}

// export interface MinimizerSearchRecordGroup {
//   records: MinimizerSearchRecord[]
//   meanScore: number
// }
//
// export interface DatasetScored {
//   dataset: Dataset
//   length: number
//   nHits: number
//   score: number
// }

// export interface DatasetSuggestionResult {
//   fastaRecord: FastaRecord
//   datasets: DatasetScored[]
//   maxScore: number
//   totalHits: number
// }

// export function mapDatasetToSeqs(records: MinimizerSearchRecord[]): Record<string, MinimizerSearchRecordGroup> {
//   const names = uniq(records.flatMap((record) => record.result.datasets.map((dataset) => dataset.name)))
//   let byDataset: Record<string, MinimizerSearchRecordGroup> = {}
//   // eslint-disable-next-line no-loops/no-loops
//   for (const name of names) {
//     // Find sequence records which match this dataset
//     const selectedRecords = records.filter((record) => record.result.datasets.some((dataset) => dataset.name === name))
//
//     // Get scores for sequence records which match this dataset
//     const scores = selectedRecords.map((record) => {
//       const dataset = record.result.datasets.find((ds) => ds.name === name)
//       return dataset?.score ?? 0
//     })
//     const meanScore = mean(scores)
//
//     byDataset = { ...byDataset, [name]: { records: selectedRecords, meanScore } }
//   }
//   return byDataset
// }
//
// /** Convert raw minimizer search results into a more convenient form */
// export function convertSuggestionResults(
//   datasets: Dataset[],
//   records: MinimizerSearchRecord[],
// ): DatasetSuggestionResult[] {
//   return records.map((record) => {
//     const datasetsScored = record.result.datasets.map((resultDataset) => {
//       const dataset = datasets.find((dataset) => resultDataset.name === dataset.path)
//       if (!dataset) {
//         throw new ErrorInternal(`Unable to find dataset by name: '${resultDataset.name}'`)
//       }
//       return {
//         dataset,
//         length: resultDataset.length,
//         nHits: resultDataset.nHits,
//         score: resultDataset.score,
//       }
//     })
//     return {
//       fastaRecord: record.fastaRecord,
//       datasets: datasetsScored,
//       maxScore: record.result.maxScore,
//       totalHits: record.result.totalHits,
//     }
//   })
// }
//
// /** Map sequence index to a list of suggested datasets (sorted by score) */
// export function mapSeqToDatasets(records: DatasetSuggestionResult[]): Map<number, DatasetScored[]> {
//   return new Map(
//     records.map((record) => [record.fastaRecord.index, sortBy(record.datasets, (dataset) => -dataset.score)]),
//   )
// }
//
// /** Map sequence index to a top suggested dataset */
// export function mapSeqToTopDataset(
//   seqToDatasets: Map<number, DatasetScored[]>,
// ): Map<number, DatasetScored | undefined> {
//   return new Map(Array.from(seqToDatasets, ([seqIndex, datasets]) => [seqIndex, datasets[0]]))
// }

export interface SuggestionResultsGrouped {
  // datasetsActive: Dataset[]
  // datasetsInactive: Dataset[]
  // topSuggestion?: Dataset
  // showSuggestions: boolean
  // numSuggestions: number
  // autodetectResults: MinimizerSearchRecord[] | undefined
  // suggestionResults: DatasetSuggestionResult[] | undefined
  // datasetToSeqs: Record<string, MinimizerSearchRecordGroup>
  datasetNameToSeqIndices: Map<string, number[]>
  // seqToDatasets: Map<number, DatasetScored[]>
  // seqToTopDataset: Map<number, DatasetScored | undefined>
  seqIndexToTopDatasetName: Map<number, string>
  seqIndicesWithoutDatasetSuggestions: number[]
  // topDatasets: Dataset[]
  // topDatasetNames: string[]
}

export function useDatasetSuggestionResults(): SuggestionResultsGrouped {
  // const datasets = useRecoilValue(datasetsAtom)
  // const bestDatasets = useRecoilValue(allDatasetSuggestionResultsAtom)

  // const bestDatasetNameForSequence = useRecoilValue(bestDatasetNameForSequenceAtom)
  // const bestDatasetForSequence = useRecoilValue(bestDatasetForSequenceAtom)
  // const topDatasetNames = useRecoilValue(topSuggestedDatasetNamesAtom)
  // const topDatasets = useRecoilValue(topSuggestedDatasetsAtom)
  const seqIndexToTopDatasetName = useRecoilValue(seqIndexToTopDatasetNameAtom)
  const seqIndicesWithoutDatasetSuggestions = useRecoilValue(seqIndicesWithoutDatasetSuggestionsAtom)
  const datasetNameToSeqIndices = useRecoilValue(datasetNameToSeqIndicesAtom)

  // return useMemo(() => processSuggestionResults(datasets, autodetectResults), [autodetectResults, datasets])
  return {
    // datasetsActive,
    // datasetsInactive,
    // topSuggestion,
    // showSuggestions,
    // numSuggestions,
    // autodetectResults,
    // suggestionResults,
    // datasetToSeqs,
    datasetNameToSeqIndices,
    // seqToDatasets,
    // seqToTopDataset,
    seqIndexToTopDatasetName,
    seqIndicesWithoutDatasetSuggestions,
    // topDatasets,
    // topDatasetNames,
  }
}

// export function processSuggestionResults(
//   datasets: Dataset[],
//   autodetectResults: MinimizerSearchRecord[] | undefined,
// ): SuggestionResultsGrouped {
//   if (isNil(autodetectResults) || isEmpty(autodetectResults)) {
//     return {
//       datasetsActive: datasets,
//       datasetsInactive: [],
//       topSuggestion: undefined,
//       showSuggestions: false,
//       numSuggestions: datasets.length,
//       autodetectResults: undefined,
//       suggestionResults: undefined,
//       datasetToSeqs: {},
//       datasetNameToSeqIndices: new Map(),
//       seqToDatasets: new Map(),
//       seqToTopDataset: new Map(),
//       seqIndexToTopDatasetName: new Map(),
//       topDatasets: [],
//       topDatasetNames: [],
//     }
//   }
//
//   const suggestionResults = convertSuggestionResults(datasets, autodetectResults)
//   const seqToDatasets = mapSeqToDatasets(suggestionResults)
//   const seqToTopDataset = mapSeqToTopDataset(seqToDatasets)
//
//   const seqIndexToTopDatasetName = new Map(
//     Array.from(seqToTopDataset.entries(), ([seqIndex, dataset]) => [seqIndex, dataset?.dataset.path]),
//   )
//
//   const topDatasetNames = uniq(
//     Array.from(seqToTopDataset.values(), (dataset) => dataset?.dataset.path)
//       .filter(notUndefinedOrNull)
//       .sort(),
//   )
//
//   const topDatasets = topDatasetNames
//     .map((name) => datasets.find((dataset) => dataset.path === name))
//     .filter(notUndefinedOrNull)
//
//   const datasetToSeqs = mapDatasetToSeqs(autodetectResults)
//   const datasetNameToSeqIndices = new Map(
//     Object.entries(datasetToSeqs).map(([datasetName, records]) => {
//       const seqIndices = records.records.map((record) => record.fastaRecord.index)
//       return [datasetName, seqIndices]
//     }),
//   )
//
//   let itemsInclude = datasets.filter((candidate) =>
//     Object.entries(datasetToSeqs).some(([dataset, _]) => dataset === candidate.path),
//   )
//
//   itemsInclude = sortBy(itemsInclude, (dataset) => {
//     const record = get(datasetToSeqs, dataset.path)
//     return -record.meanScore
//   })
//
//   itemsInclude = sortBy(itemsInclude, (dataset) => -(get(datasetToSeqs, dataset.path)?.records?.length ?? 0))
//
//   const itemsNotInclude = datasets.filter((candidate) => !itemsInclude.map((it) => it.path).includes(candidate.path))
//
//   const showSuggestions = !isNil(autodetectResults) && autodetectResults.length > 0
//
//   const datasetsActive = itemsInclude
//   const datasetsInactive = itemsNotInclude
//   const topSuggestion = first(datasetsActive)
//   const numSuggestions = datasetsActive.length
//
//   return {
//     datasetsActive,
//     datasetsInactive,
//     topSuggestion,
//     showSuggestions,
//     numSuggestions,
//     autodetectResults,
//     suggestionResults,
//     datasetToSeqs,
//     datasetNameToSeqIndices,
//     seqToDatasets,
//     seqToTopDataset,
//     seqIndexToTopDatasetName,
//     topDatasets,
//     topDatasetNames,
//   }
// }
