import { atom, atomFamily, DefaultValue, selectorFamily } from 'recoil'

import type { NextcladeResult } from 'src/algorithms/types'

export function isDefaultValue(candidate: unknown): candidate is DefaultValue {
  return candidate instanceof DefaultValue
}

// Stores analysis result for a single sequence (defined by sequence name)
// Do not use setState on this atom directly, use `analysisResultsAtom` instead!
const analysisResultSingleAtom = atomFamily<NextcladeResult, string>({
  key: 'result',
})

// Stores sequence names as they come from fasta
// Do not use setState on this atom directly, use `analysisResultsAtom` instead!
export const seqNamesAtom = atom<string[]>({
  key: 'seqName',
  default: [],
})

// Synchronizes states of `analysisResultAtom` and `seqNamesAtom`
// Use it to set `analysisResultSingleAtom` and `seqNamesAtom`
export const analysisResultsAtom = selectorFamily<NextcladeResult, string>({
  key: 'results',

  get:
    (seqName: string) =>
    ({ get }) => {
      return get(analysisResultSingleAtom(seqName))
    },

  set:
    (seqName) =>
    ({ set, reset }, result) => {
      if (isDefaultValue(result)) {
        reset(analysisResultSingleAtom(seqName))
        reset(seqNamesAtom)
      } else {
        set(analysisResultSingleAtom(seqName), result)
        set(seqNamesAtom, (prev) => {
          return [...prev, result?.seqName]
        })
      }
    },
})
