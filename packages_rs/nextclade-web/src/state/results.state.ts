import { uniq } from 'lodash'
import { atom, atomFamily, DefaultValue, selector, selectorFamily } from 'recoil'

import type { NextcladeResult } from 'src/algorithms/types'
import { AlgorithmSequenceStatus, SequenceAnalysisState } from 'src/state/algorithm/algorithm.state'

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
    ({ get }): NextcladeResult => {
      return get(analysisResultSingleAtom(seqName))
    },

  set:
    (seqName) =>
    ({ set, reset }, result: NextcladeResult | DefaultValue) => {
      if (isDefaultValue(result)) {
        reset(analysisResultSingleAtom(seqName))
        reset(seqNamesAtom)
      } else {
        set(analysisResultSingleAtom(seqName), result)
        set(seqNamesAtom, (prev) => {
          if (result && !prev.includes(result.seqName)) {
            return [...prev, result.seqName]
          }
          return prev
        })
      }
    },
})

// Selects an array of statues of all results
export const analysisResultStatusesAtom = selector<AlgorithmSequenceStatus[]>({
  key: 'analysisResultStatuses',
  get: ({ get }) => {
    const seqNames = get(seqNamesAtom)
    return seqNames.map((seqName) => {
      const result = get(analysisResultSingleAtom(seqName))
      if (result.error) {
        return AlgorithmSequenceStatus.failed
      }
      if (result.result) {
        return AlgorithmSequenceStatus.done
      }
      return AlgorithmSequenceStatus.started
    })
  },
})
