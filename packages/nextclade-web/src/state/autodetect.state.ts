import { isNil } from 'lodash'
import { atom, atomFamily, DefaultValue, selector, selectorFamily } from 'recoil'
import { invertMap } from 'src/helpers/map'
import { notUndefinedOrNull, pairValueNotUndefinedOrNull } from 'src/helpers/notUndefined'
import { datasetsAtom } from 'src/state/dataset.state'
import { isDefaultValue } from 'src/state/utils/isDefaultValue'
import type { Dataset, FindBestDatasetsResult, MinimizerIndexJson, MinimizerSearchRecord } from 'src/types'

export const minimizerIndexAtom = atom<MinimizerIndexJson>({
  key: 'minimizerIndexAtom',
})

const autodetectResultInternalAtom = atomFamily<MinimizerSearchRecord, number>({
  key: 'autodetectResultInternalAtom',
})

export const autodetectResultIndicesAtom = atom<number[]>({
  key: 'autodetectResultIndicesAtom',
  default: [],
})

export const autodetectResultByIndexAtom = selectorFamily<MinimizerSearchRecord, number>({
  key: 'autodetectResultByIndexAtom',

  get:
    (index: number) =>
    ({ get }): MinimizerSearchRecord => {
      return get(autodetectResultInternalAtom(index))
    },

  set:
    (index) =>
    ({ set, reset }, result: MinimizerSearchRecord | DefaultValue) => {
      if (isDefaultValue(result)) {
        reset(autodetectResultInternalAtom(index))
        reset(autodetectResultIndicesAtom)
      } else {
        set(autodetectResultInternalAtom(index), result)

        // Add to the list of indices
        set(autodetectResultIndicesAtom, (prev) => {
          if (result) {
            return [...prev, result.fastaRecord.index]
          }
          return prev
        })
      }
    },
})

export const autodetectResultsAtom = selector<MinimizerSearchRecord[] | undefined>({
  key: 'autodetectResultsAtom',

  get({ get }): MinimizerSearchRecord[] | undefined {
    const indices = get(autodetectResultIndicesAtom)
    if (indices.length === 0) {
      return undefined
    }
    return indices.map((index) => get(autodetectResultByIndexAtom(index)))
  },

  set({ get, set, reset }, results: MinimizerSearchRecord[] | DefaultValue | undefined) {
    const seqIndices = get(autodetectResultIndicesAtom)

    // Remove all results
    seqIndices.forEach((index) => {
      reset(autodetectResultByIndexAtom(index))
    })

    // If the operation is not 'reset', add the new items
    if (!isDefaultValue(results) && !isNil(results)) {
      results.forEach((result) => set(autodetectResultByIndexAtom(result.fastaRecord.index), result))
    } else {
      reset(autodetectRunStateAtom)
    }
  },
})

export const numberAutodetectResultsAtom = selector<number>({
  key: 'numberAutodetectResultsAtom',
  get({ get }) {
    return (get(autodetectResultsAtom) ?? []).length
  },
})

export const hasAutodetectResultsAtom = selector<boolean>({
  key: 'hasAutodetectResultsAtom',
  get({ get }) {
    return get(numberAutodetectResultsAtom) > 0
  },
})

export enum AutodetectRunState {
  Idle = 'Idle',
  Started = 'Started',
  Failed = 'Failed',
  Done = 'Done',
}

export const autodetectRunStateAtom = atom<AutodetectRunState>({
  key: 'autodetectRunStateAtom',
  default: AutodetectRunState.Idle,
})

export const isAutodetectRunningAtom = selector({
  key: 'isAutodetectRunningAtom',
  get: ({ get }) => get(autodetectRunStateAtom) === AutodetectRunState.Started,
})

export const autodetectShouldSetCurrentDatasetAtom = atom<boolean>({
  key: 'autodetectShouldSetCurrentDatasetAtom',
  default: false,
})

export const allDatasetSuggestionResultsAtom = atom<FindBestDatasetsResult>({
  key: 'suggestionResultsAtom',
  default: { suggestions: [], results: {} },
})

export const bestDatasetNameForSequenceAtom = selectorFamily<string | undefined, number>({
  key: 'bestDatasetSuggestionForSequenceAtom',
  get:
    (qryIndex: number) =>
    ({ get }) => {
      const { suggestions, results } = get(allDatasetSuggestionResultsAtom)
      const bestDataset = suggestions.find((suggestion) => suggestion.qryIndices.includes(qryIndex))
      if (bestDataset) {
        const result = results[qryIndex.toString()]
        return result.datasets.find((dataset) => dataset.name === bestDataset?.name)?.name
      }
      return undefined
    },
})

export const bestDatasetForSequenceAtom = selectorFamily<Dataset | undefined, number>({
  key: 'bestDatasetForSequenceAtom',
  get:
    (qryIndex: number) =>
    ({ get }) => {
      const datasetName = get(bestDatasetNameForSequenceAtom(qryIndex))
      const datasets = get(datasetsAtom)
      return datasets.find((dataset) => dataset.path === datasetName)
    },
})

export const topSuggestedDatasetNamesAtom = selector<string[]>({
  key: 'topSuggestedDatasetNamesAtom',
  get: ({ get }) => get(allDatasetSuggestionResultsAtom).suggestions.map((result) => result.name),
})

export const topSuggestedDatasetsAtom = selector<Dataset[]>({
  key: 'topSuggestedDatasetsAtom',
  get: ({ get }) => {
    const suggestedDatasetNames = get(topSuggestedDatasetNamesAtom)
    const datasets = get(datasetsAtom)
    return suggestedDatasetNames
      .map((datasetName) => datasets.find((dataset) => dataset.path === datasetName))
      .filter(notUndefinedOrNull)
  },
})

export const firstTopSuggestedDatasetNameAtom = selector<string | undefined>({
  key: 'firstTopSuggestedDatasetNameAtom',
  get: ({ get }) => {
    return get(topSuggestedDatasetNamesAtom)[0]
  },
})

export const firstTopSuggestedDatasetAtom = selector<Dataset | undefined>({
  key: 'firstTopSuggestedDatasetAtom',
  get: ({ get }) => {
    return get(topSuggestedDatasetsAtom)[0]
  },
})

export const numberTopSuggestedDatasetsAtom = selector<number>({
  key: 'numberTopSuggestedDatasetsAtom',
  get: ({ get }) => {
    return get(topSuggestedDatasetsAtom).length
  },
})

export const hasTopSuggestedDatasetsAtom = selector<boolean>({
  key: 'hasTopSuggestedDatasetsAtom',
  get: ({ get }) => {
    return get(numberTopSuggestedDatasetsAtom) > 0
  },
})

/** Map of sequence indices to their top suggested dataset's name. Sequences without suggestions are omitted */
export const seqIndexToTopDatasetNameAtom = selector<Map<number, string>>({
  key: 'seqIndexToTopDatasetNameAtom',
  get: ({ get }) => {
    const seqIndices = get(autodetectResultIndicesAtom)

    const entries: [number, string][] = seqIndices
      .map((seqIndex) => {
        const datasetName = get(bestDatasetNameForSequenceAtom(seqIndex))
        return [seqIndex, datasetName] as [number, string | undefined]
      })
      .filter(pairValueNotUndefinedOrNull)

    return new Map(entries)
  },
})

/** List of sequence indices for which there is no suggested dataset */
export const seqIndicesWithoutDatasetSuggestionsAtom = selector<number[]>({
  key: 'seqIndicesWithoutDatasetSuggestionsAtom',
  get: ({ get }) => {
    return get(autodetectResultIndicesAtom).filter((seqIndex) => isNil(get(bestDatasetNameForSequenceAtom(seqIndex))))
  },
})

/** List of suggestions for which we did not detect a dataset */
export const resultsWithoutDatasetSuggestionsAtom = selector<MinimizerSearchRecord[]>({
  key: 'resultsWithoutDatasetSuggestionsAtom',
  get: ({ get }) => {
    const seqIndicesWithoutDatasetSuggestions = get(seqIndicesWithoutDatasetSuggestionsAtom)
    const autodetectResults = get(autodetectResultsAtom)
    return seqIndicesWithoutDatasetSuggestions
      .map((index) => autodetectResults?.find((result) => result.fastaRecord.index === index))
      .filter(notUndefinedOrNull)
  },
})

/** Map of dataset name to the indices of sequences for which this dataset is the best suggestion */
export const datasetNameToSeqIndicesAtom = selector<Map<string, number[]>>({
  key: 'datasetNameToSeqIndicesAtom',
  get: ({ get }) => {
    const seqIndexToTopDatasetName = get(seqIndexToTopDatasetNameAtom)
    return invertMap(seqIndexToTopDatasetName)
  },
})

export const seqIndicesForDataset = selectorFamily<number[], string>({
  key: 'seqIndicesForDataset',
  get:
    (datasetName: string) =>
    ({ get }) => {
      const datasetNameToSeqIndices = get(datasetNameToSeqIndicesAtom)
      return datasetNameToSeqIndices.get(datasetName) ?? []
    },
})
