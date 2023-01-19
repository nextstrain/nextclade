import { MouseEvent, useCallback } from 'react'

export function useStopPropagation<T, U>() {
  return useCallback((e: MouseEvent<T, U>) => {
    e.stopPropagation()
  }, [])
}
