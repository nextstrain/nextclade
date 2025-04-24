import { isEmpty } from 'lodash'
import { useCallback, useEffect } from 'react'
import { atom, selector, useRecoilState, useResetRecoilState } from 'recoil'
import type { AlgorithmInput, AuspiceTree } from 'src/types'
import { clearAllFiltersAtom } from 'src/state/resultFilters.state'
import { allTreesAtom, allTreesNwkAtom, analysisResultsAtom, analysisStatusGlobalAtom } from 'src/state/results.state'
import { allViewedCdsAtom } from 'src/state/seqViewSettings.state'
import { notUndefinedOrNull } from 'src/helpers/notUndefined'
import { useResetSuggestions, useResetSuggestionsAndDatasets } from 'src/hooks/useResetSuggestions'

export const qrySeqInputsStorageAtom = atom<AlgorithmInput[]>({
  key: 'qrySeqInputsStorage',
  default: [],
})

export function useQuerySeqInputs() {
  const [qryInputs, setQryInputs] = useRecoilState(qrySeqInputsStorageAtom)
  const resetSeqInputsStorage = useResetRecoilState(qrySeqInputsStorageAtom)
  const resetSuggestions = useResetSuggestions()
  const resetSuggestionsAndDatasets = useResetSuggestionsAndDatasets()

  const resetAnalysisStatusGlobal = useResetRecoilState(analysisStatusGlobalAtom)
  const resetAnalysisResults = useResetRecoilState(analysisResultsAtom)
  const resetTree = useResetRecoilState(allTreesAtom)
  const resetNwkTree = useResetRecoilState(allTreesNwkAtom)
  const resetViewedCds = useResetRecoilState(allViewedCdsAtom)
  const resetCdsOrderPreference = useResetRecoilState(allViewedCdsAtom)
  const clearAllFilters = useResetRecoilState(clearAllFiltersAtom)

  const clearResults = useCallback(() => {
    resetSuggestions()
    resetAnalysisStatusGlobal()
    resetAnalysisResults()
    resetTree()
    resetNwkTree()
    resetViewedCds()
    resetCdsOrderPreference()
    clearAllFilters()
  }, [
    clearAllFilters,
    resetAnalysisResults,
    resetAnalysisStatusGlobal,
    resetCdsOrderPreference,
    resetNwkTree,
    resetSuggestions,
    resetTree,
    resetViewedCds,
  ])

  const addQryInputs = useCallback(
    (newInputs: AlgorithmInput[]) => {
      setQryInputs((inputs) => [...inputs, ...newInputs])
      clearResults()
    },
    [clearResults, setQryInputs],
  )

  const removeQryInput = useCallback(
    (index: number) => {
      setQryInputs((inputs) => inputs.filter((_, i) => i !== index))
      clearResults()
    },
    [clearResults, setQryInputs],
  )

  const clearQryInputs = useCallback(() => {
    resetSeqInputsStorage()
    clearResults()
  }, [clearResults, resetSeqInputsStorage])

  useEffect(() => {
    if (qryInputs.length === 0) {
      resetSuggestionsAndDatasets()
    }
  }, [qryInputs, resetSuggestions, resetSuggestionsAndDatasets])

  return { qryInputs, addQryInputs, removeQryInput, clearQryInputs }
}

export const refSeqInputAtom = atom<AlgorithmInput | undefined>({
  key: 'refSeqInput',
  default: undefined,
})

export const geneMapInputAtom = atom<AlgorithmInput | undefined>({
  key: 'geneMapInput',
  default: undefined,
})

export const refTreeInputAtom = atom<AlgorithmInput | undefined>({
  key: 'refTreeInput',
  default: undefined,
})

export const virusPropertiesInputAtom = atom<AlgorithmInput | undefined>({
  key: 'virusPropertiesInput',
  default: undefined,
})

export const hasRequiredInputsAtom = selector({
  key: 'hasRequiredInputs',
  get({ get }) {
    return !isEmpty(get(qrySeqInputsStorageAtom))
  },
})

export const datasetJsonAtom = atom<AuspiceTree | undefined>({
  key: 'datasetJson',
  default: undefined,
})

/** Counts how many custom inputs are set */
export const inputCustomizationCounterAtom = selector<number>({
  key: 'inputCustomizationCounterAtom',
  get: ({ get }) => {
    return [get(refSeqInputAtom), get(geneMapInputAtom), get(refTreeInputAtom), get(virusPropertiesInputAtom)].filter(
      notUndefinedOrNull,
    ).length
  },
})

/** Resets all dataset files */
export const datasetFilesResetAtom = selector<undefined>({
  key: 'datasetFilesResetAtom',
  get: () => undefined,
  set({ reset }) {
    reset(refSeqInputAtom)
    reset(geneMapInputAtom)
    reset(refTreeInputAtom)
    reset(virusPropertiesInputAtom)
    reset(datasetJsonAtom)
  },
})
