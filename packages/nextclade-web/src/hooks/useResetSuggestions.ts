import { useCallback } from 'react'
import { useResetRecoilState } from 'recoil'
import {
  allDatasetSuggestionResultsAtom,
  autodetectErrorAtom,
  autodetectResultsAtom,
  autodetectRunStateAtom,
} from 'src/state/autodetect.state'
import { datasetSelectionAtom } from 'src/state/dataset.state'

export function useResetSuggestions() {
  const resetAutodetectResultsAtom = useResetRecoilState(autodetectResultsAtom)
  const resetAutodetectRunStateAtom = useResetRecoilState(autodetectRunStateAtom)
  const resetAutodetectErrorAtom = useResetRecoilState(autodetectErrorAtom)
  return useCallback(() => {
    resetAutodetectResultsAtom()
    resetAutodetectRunStateAtom()
    resetAutodetectErrorAtom()
  }, [resetAutodetectErrorAtom, resetAutodetectResultsAtom, resetAutodetectRunStateAtom])
}

export function useResetSuggestionsAndDatasets() {
  const resetSuggestions = useResetSuggestions()
  const resetAllDatasetSuggestionResultsAtom = useResetRecoilState(allDatasetSuggestionResultsAtom)

  return useCallback(() => {
    resetSuggestions()
    resetAllDatasetSuggestionResultsAtom()
  }, [resetAllDatasetSuggestionResultsAtom, resetSuggestions])
}

export function useResetSuggestionsAndCurrentDataset() {
  const resetSuggestions = useResetSuggestions()
  const resetAllDatasetSuggestionResultsAtom = useResetRecoilState(allDatasetSuggestionResultsAtom)
  const resetDatasetSelection = useResetRecoilState(datasetSelectionAtom)

  return useCallback(() => {
    resetSuggestions()
    resetAllDatasetSuggestionResultsAtom()
    resetDatasetSelection()
  }, [resetAllDatasetSuggestionResultsAtom, resetSuggestions, resetDatasetSelection])
}
