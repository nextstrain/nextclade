/* eslint-disable no-void */
import type { AuspiceJsonV2, CladeNodeAttrDesc } from 'auspice'
import { isNil, union } from 'lodash'
import { atom, selectorFamily } from 'recoil'
import { atom as jotaiAtom } from 'jotai'
import { atomFamily as jotaiAtomFamily } from 'jotai/utils'
import { multiAtom } from 'src/state/utils/multiAtom'
import type {
  AaMotifsDesc,
  AnalysisInitialData,
  AuspiceRefNodesDesc,
  Cds,
  CsvColumnConfig,
  Gene,
  NextcladeResult,
  PhenotypeAttrDesc,
} from 'src/types'
import { AlgorithmGlobalStatus, getResultStatus } from 'src/types'
import { plausible } from 'src/components/Common/Plausible'
import { runFilters } from 'src/filtering/runFilters'
import {
  SortCategory,
  SortDirection,
  sortMotifs,
  sortResults,
  sortCustomNodeAttribute,
  sortPhenotypeValue,
} from 'src/helpers/sortResults'
import {
  aaFilterAtom,
  cladesFilterAtom,
  mutationsFilterAtom,
  seqNamesFilterAtom,
  showBadFilterAtom,
  showErrorsFilterAtom,
  showGoodFilterAtom,
  showMediocreFilterAtom,
} from 'src/state/resultFilters.state'
import { persistAtom } from 'src/state/persist/localStorage'

// Stores analysis result for a single sequence (defined by sequence index)
// Do not use setState on this atom directly, use `analysisResultAtom` instead!
const analysisResultInternalAtom = jotaiAtomFamily((index: number) => jotaiAtom<NextcladeResult>({} as NextcladeResult))

// Stores sequence names as they come from fasta
// Do not use setState on this atom directly, use `analysisResultAtom` instead!
export const seqIndicesAtom = jotaiAtom<number[]>([])

// Stores a map from sequence index to an array od sequences with the same name
export const seqNameDuplicatesAtom = jotaiAtomFamily((seqName: string) => jotaiAtom<number[]>([]))

// Synchronizes states of `analysisResultAtom` and `seqIndicesAtom`
// Use it to set `analysisResultInternalAtom` and `seqIndicesAtom`
export const analysisResultAtom = jotaiAtomFamily((index: number) =>
  jotaiAtom(
    (get) => get(analysisResultInternalAtom(index)),
    (get, set, result: NextcladeResult) => {
      set(analysisResultInternalAtom(index), result)

      // Add to the list of indices
      const currentIndices = get(seqIndicesAtom)
      if (result && !currentIndices.includes(result.index)) {
        set(seqIndicesAtom, [...currentIndices, result.index])
      }

      // Add to the duplicate names map
      const currentDuplicates = get(seqNameDuplicatesAtom(result.seqName))
      set(seqNameDuplicatesAtom(result.seqName), union(currentDuplicates, [result.index]))
    },
  ),
)

export const seqIndicesFilteredAtom = jotaiAtom((get) => {
  const results = get(analysisResultsAtom)

  const filters = {
    seqNamesFilter: get(seqNamesFilterAtom),
    mutationsFilter: get(mutationsFilterAtom),
    aaFilter: get(aaFilterAtom),
    cladesFilter: get(cladesFilterAtom),
    showGood: get(showGoodFilterAtom),
    showMediocre: get(showMediocreFilterAtom),
    showBad: get(showBadFilterAtom),
    showErrors: get(showErrorsFilterAtom),
  }

  const resultsFiltered = runFilters(results, filters)

  return resultsFiltered.map(({ index }) => index)
})

export const sortAnalysisResultsAtom = jotaiAtomFamily((params: { category: SortCategory; direction: SortDirection }) =>
  jotaiAtom(null, (get, set) => {
    const results = get(analysisResultsAtom)
    const resultsSorted = sortResults(results, { category: params.category, direction: params.direction })
    const seqIndicesSorted = resultsSorted.map((result) => result.index)
    set(seqIndicesAtom, seqIndicesSorted)
  }),
)

export const sortAnalysisResultsByCustomNodeAttributesAtom = jotaiAtomFamily(
  (params: { key: string; direction: SortDirection }) =>
    jotaiAtom(null, (get, set) => {
      const results = get(analysisResultsAtom)
      const resultsSorted = sortCustomNodeAttribute(results, { key: params.key, direction: params.direction })
      const seqIndicesSorted = resultsSorted.map((result) => result.index)
      set(seqIndicesAtom, seqIndicesSorted)
    }),
)

export const sortAnalysisResultsByPhenotypeValuesAtom = jotaiAtomFamily(
  (params: { key: string; direction: SortDirection }) =>
    jotaiAtom(null, (get, set) => {
      const results = get(analysisResultsAtom)
      const resultsSorted = sortPhenotypeValue(results, { key: params.key, direction: params.direction })
      const seqIndicesSorted = resultsSorted.map((result) => result.index)
      set(seqIndicesAtom, seqIndicesSorted)
    }),
)

export const sortAnalysisResultsByMotifsAtom = jotaiAtomFamily((params: { key: string; direction: SortDirection }) =>
  jotaiAtom(null, (get, set) => {
    const results = get(analysisResultsAtom)
    const resultsSorted = sortMotifs(results, { key: params.key, direction: params.direction })
    const seqIndicesSorted = resultsSorted.map((result) => result.index)
    set(seqIndicesAtom, seqIndicesSorted)
  }),
)

/**
 * Access array of analysis results
 * NOTE: `set` operation will replace the existing elements in the array with the new ones
 */
export const analysisResultsAtom = jotaiAtom(
  (get) => {
    const seqIndices = get(seqIndicesAtom)
    return seqIndices.map((index) => get(analysisResultAtom(index)))
  },
  (get, set, results: NextcladeResult[]) => {
    const seqIndices = get(seqIndicesAtom)

    // Clear duplicate mappings for all old sequence names before resetting
    seqIndices.forEach((index) => {
      const oldResult = get(analysisResultInternalAtom(index))
      if (oldResult?.seqName) {
        set(seqNameDuplicatesAtom(oldResult.seqName), [])
      }
    })

    // Remove all results - reset to empty arrays
    seqIndices.forEach((index) => {
      set(analysisResultInternalAtom(index), {} as NextcladeResult)
    })
    set(seqIndicesAtom, [])

    // Add the new results
    results.forEach((result) => set(analysisResultAtom(result.index), result))
  },
)

// Selects an array of statues of all results
export const analysisResultStatusesAtom = jotaiAtom((get) => {
  const seqIndices = get(seqIndicesAtom)
  return seqIndices.map((index) => {
    const result = get(analysisResultInternalAtom(index))
    return getResultStatus(result)
  })
})

export const [genomeSizeAtom, allGenomeSizesAtom] = multiAtom<number, { datasetName: string }>({
  key: 'genomeSize',
})

export const [genesAtom, allGenesAtom] = multiAtom<Gene[], { datasetName: string }>({
  key: 'genes',
})

export const [cdsesAtom, allCdsesAtom] = multiAtom<Cds[], { datasetName: string }>({
  key: 'cdses',
})

export const cdsAtom = selectorFamily<Cds | undefined, { datasetName: string; cdsName: string }>({
  key: 'cds',
  get:
    ({ datasetName, cdsName }) =>
    ({ get }) =>
      get(cdsesAtom({ datasetName }))?.find((cds) => cds.name === cdsName),
})

export const [treeAtom, allTreesAtom] = multiAtom<AuspiceJsonV2 | undefined | null, string>({
  key: 'tree',
})

export const [treeNwkAtom, allTreesNwkAtom] = multiAtom<string | undefined | null, { datasetName: string }>({
  key: 'treeNwk',
})

export const hasTreeAtom = selectorFamily<boolean, { datasetName: string }>({
  key: 'hasTree',
  get:
    ({ datasetName }) =>
    ({ get }) => {
      return !isNil(get(treeAtom(datasetName)))
    },
})

export const [cladeNodeAttrDescsAtom, allCladeNodeAttrDescsAtom] = multiAtom<
  CladeNodeAttrDesc[],
  { datasetName: string }
>({
  key: 'cladeNodeAttrDescs',
})

export const [phenotypeAttrDescsAtom, allPhenotypeAttrDescsAtom] = multiAtom<
  PhenotypeAttrDesc[],
  { datasetName: string }
>({
  key: 'phenotypeAttrDescs',
})

export const [refNodesAtom, allRefNodesAtom] = multiAtom<AuspiceRefNodesDesc, { datasetName: string }>({
  key: 'refNodes',
})

export const [currentRefNodeNameAtom, allCurrentRefNodeNameAtom] = multiAtom<string, { datasetName: string }>({
  key: 'currentRefNode',
})

export const [aaMotifsDescsAtom, allAaMotifsDescsAtom] = multiAtom<AaMotifsDesc[], { datasetName: string }>({
  key: 'aaMotifsDescsAtom',
})

export const [initialDataAtom, allInitialDataAtom] = multiAtom<AnalysisInitialData, string>({
  key: 'initialDataAtom',
})

export const csvColumnConfigAtom = atom<CsvColumnConfig | undefined>({
  key: 'csvColumnConfigAtom',
  default: undefined,
  effects: [persistAtom],
})

export const analysisStatusGlobalAtom = jotaiAtom(AlgorithmGlobalStatus.idle)

// Analytics tracking effect - simplified for Jotai
export const trackAnalyticsAtom = jotaiAtom(null, (get, set, status: AlgorithmGlobalStatus) => {
  // Update status
  set(analysisStatusGlobalAtom, status)

  // Analytics tracking
  switch (status) {
    case AlgorithmGlobalStatus.started:
      // For now, simplified tracking without dataset promise resolution
      plausible('Run started', { props: { 'dataset v3': 'unknown' } })
      break

    case AlgorithmGlobalStatus.done: {
      const results = get(analysisResultsAtom)
      plausible('Run completed', {
        props: {
          'sequences': results.length,
          'dataset v3': 'unknown',
        },
      })
      break
    }

    case AlgorithmGlobalStatus.failed:
      plausible('Run failed')
      break
  }
})
export const isAnalysisRunningAtom = jotaiAtom((get) => {
  const status = get(analysisStatusGlobalAtom)
  return !(
    status === AlgorithmGlobalStatus.idle ||
    status === AlgorithmGlobalStatus.done ||
    status === AlgorithmGlobalStatus.failed
  )
})

export const hasRanAtom = jotaiAtom((get) => {
  const status = get(analysisStatusGlobalAtom)
  return status !== AlgorithmGlobalStatus.idle
})

export const canDownloadAtom = jotaiAtom((get) => {
  const globalStatus = get(analysisStatusGlobalAtom)
  return globalStatus === AlgorithmGlobalStatus.done
})
