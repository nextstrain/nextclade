/* eslint-disable no-void */
import type { AuspiceJsonV2, AuspiceState, CladeNodeAttrDesc } from 'auspice'
import { concurrent } from 'fasy'
import { isNil } from 'lodash'
import { atom, atomFamily, DefaultValue, selector, selectorFamily } from 'recoil'
import { multiAtom } from 'src/state/utils/multiAtom'
import type {
  AaMotifsDesc,
  AuspiceRefNodesDesc,
  Cds,
  CsvColumnConfig,
  Gene,
  NextcladeResult,
  PhenotypeAttrDesc,
} from 'src/types'
import { AlgorithmGlobalStatus, AlgorithmSequenceStatus, getResultStatus } from 'src/types'
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
import { datasetsCurrentAtom } from 'src/state/dataset.state'
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
import { isDefaultValue } from 'src/state/utils/isDefaultValue'
import { persistAtom } from 'src/state/persist/localStorage'

// Stores analysis result for a single sequence (defined by sequence name)
// Do not use setState on this atom directly, use `analysisResultAtom` instead!
const analysisResultInternalAtom = atomFamily<NextcladeResult, number>({
  key: 'analysisResultSingle',
})

// Stores sequence names as they come from fasta
// Do not use setState on this atom directly, use `analysisResultAtom` instead!
export const seqIndicesAtom = atom<number[]>({
  key: 'seqIndices',
  default: [],
})

// Stores a map from sequence index to an array od sequences with the same name
export const seqNameDuplicatesAtom = atomFamily<number[], string>({
  key: 'seqNameDuplicates',
  default: [],
})

// Synchronizes states of `analysisResultAtom` and `seqIndicesAtom`
// Use it to set `analysisResultInternalAtom` and `seqIndicesAtom`
export const analysisResultAtom = selectorFamily<NextcladeResult, number>({
  key: 'analysisResult',

  get:
    (index: number) =>
    ({ get }): NextcladeResult => {
      return get(analysisResultInternalAtom(index))
    },

  set:
    (index) =>
    ({ get, set, reset }, result: NextcladeResult | DefaultValue) => {
      if (isDefaultValue(result)) {
        const result = get(analysisResultInternalAtom(index))
        reset(seqNameDuplicatesAtom(result.seqName))
        reset(analysisResultInternalAtom(index))
        reset(seqIndicesAtom)
      } else {
        set(analysisResultInternalAtom(index), result)

        // Add to the list of indices
        set(seqIndicesAtom, (prev) => {
          if (result && !prev.includes(result.index)) {
            return [...prev, result.index]
          }
          return prev
        })

        // Add to the duplicate names map
        const indices = get(seqNameDuplicatesAtom(result.seqName))
        set(seqNameDuplicatesAtom(result.seqName), [...indices, result.index])
      }
    },
})

export const seqIndicesFilteredAtom = selector<number[]>({
  key: 'seqIndicesFiltered',

  get: ({ get }) => {
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
  },
})

export const sortAnalysisResultsAtom = selectorFamily<undefined, { category: SortCategory; direction: SortDirection }>({
  key: 'sortAnalysisResults',

  get: () => () => undefined,

  set:
    ({ category, direction }) =>
    ({ get, set }, def: undefined | DefaultValue) => {
      const results = get(analysisResultsAtom)

      let sortCategory = category
      if (isDefaultValue(def)) {
        sortCategory = SortCategory.index
      }

      const resultsSorted = sortResults(results, { category: sortCategory, direction })
      const seqIndicesSorted = resultsSorted.map((result) => result.index)

      set(seqIndicesAtom, seqIndicesSorted)
    },
})

export const sortAnalysisResultsByCustomNodeAttributesAtom = selectorFamily<
  undefined,
  { key: string; direction: SortDirection }
>({
  key: 'sortAnalysisResultsByCustomNodeAttributes',

  get: () => () => undefined,

  set:
    ({ key, direction }) =>
    ({ get, set }, def: undefined | DefaultValue) => {
      const results = get(analysisResultsAtom)

      const resultsSorted = isDefaultValue(def)
        ? sortResults(results, { category: SortCategory.index, direction })
        : sortCustomNodeAttribute(results, { key, direction })

      const seqIndicesSorted = resultsSorted.map((result) => result.index)
      set(seqIndicesAtom, seqIndicesSorted)
    },
})

export const sortAnalysisResultsByPhenotypeValuesAtom = selectorFamily<
  undefined,
  { key: string; direction: SortDirection }
>({
  key: 'sortAnalysisResultsByPhenotypeValues',

  get: () => () => undefined,

  set:
    ({ key, direction }) =>
    ({ get, set }, def: undefined | DefaultValue) => {
      const results = get(analysisResultsAtom)

      const resultsSorted = isDefaultValue(def)
        ? sortResults(results, { category: SortCategory.index, direction })
        : sortPhenotypeValue(results, { key, direction })

      const seqIndicesSorted = resultsSorted.map((result) => result.index)
      set(seqIndicesAtom, seqIndicesSorted)
    },
})

export const sortAnalysisResultsByMotifsAtom = selectorFamily<undefined, { key: string; direction: SortDirection }>({
  key: 'sortAnalysisResultsByMotifsAtom',

  get: () => () => undefined,

  set:
    ({ key, direction }) =>
    ({ get, set }, def: undefined | DefaultValue) => {
      const results = get(analysisResultsAtom)

      const resultsSorted = isDefaultValue(def)
        ? sortResults(results, { category: SortCategory.index, direction })
        : sortMotifs(results, { key, direction })

      const seqIndicesSorted = resultsSorted.map((result) => result.index)
      set(seqIndicesAtom, seqIndicesSorted)
    },
})

/**
 * Access array of analysis results
 * NOTE: `set` operation will replace the existing elements in the array with the new ones
 */
export const analysisResultsAtom = selector<NextcladeResult[]>({
  key: 'analysisResults',

  get({ get }): NextcladeResult[] {
    const seqIndices = get(seqIndicesAtom)
    return seqIndices.map((index) => get(analysisResultAtom(index)))
  },

  set({ get, set, reset }, results: NextcladeResult[] | DefaultValue) {
    const seqIndices = get(seqIndicesAtom)

    // Remove all results
    seqIndices.forEach((index) => {
      reset(analysisResultAtom(index))
    })

    // If the operation is not 'reset', add the new items
    if (!isDefaultValue(results)) {
      results.forEach((result) => set(analysisResultAtom(result.index), result))
    }
  },
})

// Selects an array of statues of all results
export const analysisResultStatusesAtom = selector<AlgorithmSequenceStatus[]>({
  key: 'analysisResultStatuses',
  get: ({ get }) => {
    const seqIndices = get(seqIndicesAtom)
    return seqIndices.map((index) => {
      const result = get(analysisResultInternalAtom(index))
      return getResultStatus(result)
    })
  },
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

export const [treeAtom, allTreesAtom] = multiAtom<AuspiceJsonV2 | undefined, { datasetName: string }>({
  key: 'tree',
})

export const [treeNwkAtom, allTreesNwkAtom] = multiAtom<string | undefined, { datasetName: string }>({
  key: 'treeNwk',
})

// HACK(auspice): Remember the entire Auspice redux state in an atom, for each dataset. This way we can
// save and load Auspice redux state when switching datasets, this way switching what Auspice is
// rendering without recomputing it all again.
export const [auspiceStateAtom, allAuspiceStatesAtom] = multiAtom<AuspiceState | undefined, { datasetName: string }>({
  key: 'auspiceState',
})

export const hasTreeAtom = selectorFamily<boolean, { datasetName: string }>({
  key: 'hasTree',
  get:
    ({ datasetName }) =>
    ({ get }) => {
      return !isNil(get(treeAtom({ datasetName })))
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

export const csvColumnConfigAtom = atom<CsvColumnConfig | undefined>({
  key: 'csvColumnConfigAtom',
  default: undefined,
  effects: [persistAtom],
})

export const analysisStatusGlobalAtom = atom({
  key: 'analysisStatusGlobal',
  default: AlgorithmGlobalStatus.idle,
  effects: [
    ({ getPromise, onSet }) => {
      onSet((status) => {
        switch (status) {
          case AlgorithmGlobalStatus.started:
            void getPromise(datasetsCurrentAtom).then(async (datasets) => {
              return concurrent.forEach(async (dataset) => {
                plausible('Run started', { props: { 'dataset v3': dataset?.path ?? 'unknown' } })
              }, datasets)
            })
            break

          case AlgorithmGlobalStatus.done:
            void Promise.all([getPromise(analysisResultsAtom), getPromise(datasetsCurrentAtom)]).then(
              async ([results, datasets]) => {
                return concurrent.forEach(async (dataset) => {
                  const resultsForDataset = results.filter(
                    (result) => result.result?.analysisResult.datasetName === dataset.path,
                  )
                  plausible('Run completed', {
                    props: {
                      'sequences': resultsForDataset.length,
                      'dataset v3': dataset?.path ?? 'unknown',
                    },
                  })
                }, datasets)
              },
            )
            break

          case AlgorithmGlobalStatus.failed:
            plausible('Run failed')
            break
        }
      })
    },
  ],
})
export const canRunAtom = selector({
  key: 'canRun',
  get({ get }) {
    const status = get(analysisStatusGlobalAtom)
    return (
      status === AlgorithmGlobalStatus.idle ||
      status === AlgorithmGlobalStatus.done ||
      status === AlgorithmGlobalStatus.failed
    )
  },
})
export const hasRanAtom = selector({
  key: 'hasRan',
  get({ get }) {
    const status = get(analysisStatusGlobalAtom)
    return status !== AlgorithmGlobalStatus.idle
  },
})
export const canDownloadAtom = selector<boolean>({
  key: 'canDownload',
  get({ get }) {
    const globalStatus = get(analysisStatusGlobalAtom)
    return globalStatus === AlgorithmGlobalStatus.done
  },
})
