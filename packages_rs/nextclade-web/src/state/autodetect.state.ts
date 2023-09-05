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

export const autodetectResultAtom = selectorFamily<MinimizerSearchRecord, number>({
  key: 'autodetectResultAtom',

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
          if (result && !prev.includes(result.fastaRecord.index)) {
            return [...prev, result.fastaRecord.index]
          }
          return prev
        })
      }
    },
})

export const autodetectResultsAtom = selector<MinimizerSearchRecord[]>({
  key: 'autodetectResultsAtom',

  get({ get }): MinimizerSearchRecord[] {
    const indices = get(autodetectResultIndicesAtom)
    return indices.map((index) => get(autodetectResultAtom(index)))
  },

  set({ get, set, reset }, results: MinimizerSearchRecord[] | DefaultValue) {
    const seqIndices = get(autodetectResultIndicesAtom)

    // Remove all results
    seqIndices.forEach((index) => {
      reset(autodetectResultAtom(index))
    })

    // If the operation is not 'reset', add the new items
    if (!isDefaultValue(results)) {
      results.forEach((result) => set(autodetectResultAtom(result.fastaRecord.index), result))
    }
  },
})
