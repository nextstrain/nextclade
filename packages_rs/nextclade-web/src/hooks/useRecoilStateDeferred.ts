import { useCallback, useState, useTransition } from 'react'
import type { RecoilState, SetterOrUpdater } from 'recoil'
import { useRecoilState_TRANSITION_SUPPORT_UNSTABLE } from 'recoil' // eslint-disable-line camelcase

export type ValOrUpdater<T> = ((currVal: T) => T) | T

export function useRecoilStateDeferred<T>(recoilState: RecoilState<T>): [T, SetterOrUpdater<T>] {
  const [initialValue, setRecoilValue] = useRecoilState_TRANSITION_SUPPORT_UNSTABLE(recoilState)
  const [value, setValue] = useState(initialValue)
  const [, startTransition] = useTransition()
  const setValueDeferred = useCallback(
    (valOrUpdater: ValOrUpdater<T>) => {
      setValue(valOrUpdater)
      startTransition(() => {
        setRecoilValue(valOrUpdater)
      })
    },
    [setRecoilValue],
  )
  return [value, setValueDeferred]
}
