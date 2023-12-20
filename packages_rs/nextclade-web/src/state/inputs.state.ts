import { isEmpty } from 'lodash'
import { useCallback, useEffect } from 'react'
import { atom, selector, useRecoilState, useResetRecoilState } from 'recoil'
import { cdsOrderPreferenceAtom } from 'src/state/dataset.state'
import { clearAllFiltersAtom } from 'src/state/resultFilters.state'
import { analysisResultsAtom, analysisStatusGlobalAtom, treeAtom } from 'src/state/results.state'
import { viewedCdsAtom } from 'src/state/seqViewSettings.state'
import { AlgorithmInput } from 'src/types'
import { notUndefinedOrNull } from 'src/helpers/notUndefined'
import { useResetSuggestions } from 'src/hooks/useResetSuggestions'

export const qrySeqInputsStorageAtom = atom<AlgorithmInput[]>({
  key: 'qrySeqInputsStorage',
  default: [],
})

export function useQuerySeqInputs() {
  const [qryInputs, setQryInputs] = useRecoilState(qrySeqInputsStorageAtom)
  const resetSeqInputsStorage = useResetRecoilState(qrySeqInputsStorageAtom)
  const resetSuggestions = useResetSuggestions()

  const resetAnalysisStatusGlobal = useResetRecoilState(analysisStatusGlobalAtom)
  const resetAnalysisResults = useResetRecoilState(analysisResultsAtom)
  const resetTree = useResetRecoilState(treeAtom)
  const resetViewedCds = useResetRecoilState(viewedCdsAtom)
  const resetCdsOrderPreference = useResetRecoilState(cdsOrderPreferenceAtom)
  const clearAllFilters = useResetRecoilState(clearAllFiltersAtom)

  const clearResults = useCallback(() => {
    resetSuggestions()
    resetAnalysisStatusGlobal()
    resetAnalysisResults()
    resetTree()
    resetViewedCds()
    resetCdsOrderPreference()
    clearAllFilters()
  }, [
    clearAllFilters,
    resetAnalysisResults,
    resetAnalysisStatusGlobal,
    resetCdsOrderPreference,
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
      resetSuggestions()
    }
  }, [qryInputs, resetSuggestions])

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

/** Counts how many custom inputs are set */
export const inputCustomizationCounterAtom = selector<number>({
  key: 'inputCustomizationCounterAtom',
  get: ({ get }) => {
    return [get(refSeqInputAtom), get(geneMapInputAtom), get(refTreeInputAtom), get(virusPropertiesInputAtom)].filter(
      notUndefinedOrNull,
    ).length
  },
})

/** Resets all inputs (e.g. when switching datasets) */
export const inputResetAtom = selector<undefined>({
  key: 'inputReset',
  get: () => undefined,
  set({ reset }) {
    reset(qrySeqInputsStorageAtom)
    reset(refSeqInputAtom)
    reset(geneMapInputAtom)
    reset(refTreeInputAtom)
    reset(virusPropertiesInputAtom)
  },
})
