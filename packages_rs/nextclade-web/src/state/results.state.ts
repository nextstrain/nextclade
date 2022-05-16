import type { AuspiceJsonV2, CladeNodeAttrDesc } from 'auspice'
import { isNil } from 'lodash'
import { atom, atomFamily, DefaultValue, selector, selectorFamily } from 'recoil'

import type { Gene, NextcladeResult } from 'src/algorithms/types'
import { AlgorithmGlobalStatus, AlgorithmSequenceStatus } from 'src/state/algorithm/algorithm.state'
import { analysisStatusGlobalAtom } from 'src/state/analysisStatusGlobal.state'

export function isDefaultValue(candidate: unknown): candidate is DefaultValue {
  return candidate instanceof DefaultValue
}

// Stores analysis result for a single sequence (defined by sequence name)
// Do not use setState on this atom directly, use `analysisResultAtom` instead!
const analysisResultInternalAtom = atomFamily<NextcladeResult, string>({
  key: 'analysisResultSingle',
})

// Stores sequence names as they come from fasta
// Do not use setState on this atom directly, use `analysisResultAtom` instead!
export const seqNamesAtom = atom<string[]>({
  key: 'seqName',
  default: [],
})

// Synchronizes states of `analysisResultAtom` and `seqNamesAtom`
// Use it to set `analysisResultInternalAtom` and `seqNamesAtom`
export const analysisResultAtom = selectorFamily<NextcladeResult, string>({
  key: 'analysisResult',

  get:
    (seqName: string) =>
    ({ get }): NextcladeResult => {
      return get(analysisResultInternalAtom(seqName))
    },

  set:
    (seqName) =>
    ({ set, reset }, result: NextcladeResult | DefaultValue) => {
      if (isDefaultValue(result)) {
        reset(analysisResultInternalAtom(seqName))
        reset(seqNamesAtom)
      } else {
        set(analysisResultInternalAtom(seqName), result)
        set(seqNamesAtom, (prev) => {
          if (result && !prev.includes(result.seqName)) {
            return [...prev, result.seqName]
          }
          return prev
        })
      }
    },
})

/**
 * Access array of analysis results
 * NOTE: `set` operation will replace the existing elements in the array with the new ones
 */
export const analysisResultsAtom = selector<NextcladeResult[]>({
  key: 'analysisResults',

  get({ get }): NextcladeResult[] {
    const seqNames = get(seqNamesAtom)
    return seqNames.map((seqName) => get(analysisResultAtom(seqName)))
  },

  set({ get, set, reset }, results: NextcladeResult[] | DefaultValue) {
    const seqNames = get(seqNamesAtom)

    // Remove all results
    seqNames.forEach((seqName) => {
      reset(analysisResultAtom(seqName))
    })

    // If the operation is not reset, add the new items
    if (!isDefaultValue(results)) {
      results.forEach((result) => set(analysisResultAtom(result.seqName), result))
    }
  },
})

// Selects an array of statues of all results
export const analysisResultStatusesAtom = selector<AlgorithmSequenceStatus[]>({
  key: 'analysisResultStatuses',
  get: ({ get }) => {
    const seqNames = get(seqNamesAtom)
    return seqNames.map((seqName) => {
      const result = get(analysisResultInternalAtom(seqName))
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

export const genomeSizeAtom = atom<number>({
  key: 'genomeSize',
})

export const geneMapAtom = atom<Gene[]>({
  key: 'geneMap',
  default: [],
})

export const geneNamesAtom = selector<string[]>({
  key: 'geneNames',
  get: ({ get }) => get(geneMapAtom).map((gene) => gene.geneName),
})

export const treeAtom = atom<AuspiceJsonV2 | undefined>({
  key: 'tree',
  default: undefined,
})

export const hasTreeAtom = selector<boolean>({
  key: 'hasTree',
  get({ get }) {
    return !isNil(get(treeAtom))
  },
})

export const cladeNodeAttrDescsAtom = atom<CladeNodeAttrDesc[]>({
  key: 'cladeNodeAttrDescs',
  default: [],
})

export const cladeNodeAttrKeysAtom = selector<string[]>({
  key: 'cladeNodeAttrKeys',
  get: ({ get }) => get(cladeNodeAttrDescsAtom).map((desc) => desc.name),
})

export const canDownloadAtom = selector<boolean>({
  key: 'canDownload',
  get({ get }) {
    const globalStatus = get(analysisStatusGlobalAtom)
    const resultStatuses = get(analysisResultStatusesAtom)
    const tree = get(treeAtom)
    return (
      globalStatus === AlgorithmGlobalStatus.done &&
      resultStatuses.includes(AlgorithmSequenceStatus.done) &&
      !isNil(tree)
    )
  },
})
