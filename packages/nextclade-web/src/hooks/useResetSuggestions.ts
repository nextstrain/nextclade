import { useCallback } from 'react'
import { useResetRecoilState } from 'recoil'
import { autodetectResultsAtom, autodetectRunStateAtom } from 'src/state/autodetect.state'

export function useResetSuggestions() {
  const resetAutodetectResultsAtom = useResetRecoilState(autodetectResultsAtom)
  const resetAutodetectRunStateAtom = useResetRecoilState(autodetectRunStateAtom)
  return useCallback(() => {
    resetAutodetectResultsAtom()
    resetAutodetectRunStateAtom()
  }, [resetAutodetectResultsAtom, resetAutodetectRunStateAtom])
}
