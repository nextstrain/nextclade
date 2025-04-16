import { useCallback } from 'react'
import { useResetRecoilState } from 'recoil'
import {
  allDatasetSuggestionResultsAtom,
  autodetectResultsAtom,
  autodetectRunStateAtom,
} from 'src/state/autodetect.state'
import { datasetsCurrentAtom } from 'src/state/dataset.state'

export function useResetSuggestions() {
  const resetAutodetectResultsAtom = useResetRecoilState(autodetectResultsAtom)
  const resetAutodetectRunStateAtom = useResetRecoilState(autodetectRunStateAtom)
  return useCallback(() => {
    resetAutodetectResultsAtom()
    resetAutodetectRunStateAtom()
  }, [resetAutodetectResultsAtom, resetAutodetectRunStateAtom])
}

export function useResetSuggestionsAndDatasets() {
  const resetSuggestions = useResetSuggestions()
  const resetDatasetsCurrentAtom = useResetRecoilState(datasetsCurrentAtom)
  const resetAllDatasetSuggestionResultsAtom = useResetRecoilState(allDatasetSuggestionResultsAtom)

  return useCallback(() => {
    resetSuggestions()
    resetDatasetsCurrentAtom()
    resetAllDatasetSuggestionResultsAtom()
  }, [resetAllDatasetSuggestionResultsAtom, resetDatasetsCurrentAtom, resetSuggestions])
}
