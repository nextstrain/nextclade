import { useCallback } from 'react'
import { useResetRecoilState } from 'recoil'
import {
  allDatasetSuggestionResultsAtom,
  autodetectErrorAtom,
  autodetectResultsAtom,
  autodetectRunStateAtom,
} from 'src/state/autodetect.state'

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
