import { isNil } from 'lodash'
import { atom, atomFamily, DefaultValue, selector, selectorFamily } from 'recoil'
import type { MinimizerIndexJson, MinimizerSearchRecord } from 'src/types'
import { isDefaultValue } from 'src/state/utils/isDefaultValue'

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

// Dataset ID to use for when dataset is not autodetected
export const DATASET_ID_UNDETECTED = 'undetected'

// Select autodetect results by dataset name
export const autodetectResultsByDatasetAtom = selectorFamily<MinimizerSearchRecord[] | undefined, string>({
  key: 'autodetectResultByDatasetAtom',

  get:
    (datasetId: string) =>
    ({ get }): MinimizerSearchRecord[] | undefined => {
      const results = get(autodetectResultsAtom)
      if (isNil(results)) {
        return undefined
      }

      return results.filter((result) => {
        if (datasetId === DATASET_ID_UNDETECTED) {
          return isNil(result.result.dataset)
        }
        return result.result.dataset === datasetId
      })
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
