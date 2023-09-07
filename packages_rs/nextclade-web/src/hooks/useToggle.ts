import { useCallback, useState } from 'react'
import { RecoilState, useRecoilState } from 'recoil'

export type VoidFunc = () => void

export function useToggle(initialState = false): [boolean, VoidFunc, VoidFunc, VoidFunc] {
  const [state, setState] = useState(initialState)
  const toggle = useCallback(() => setState((state) => !state), [])
  const enable = useCallback(() => setState(true), [])
  const disable = useCallback(() => setState(false), [])
  return [state, toggle, enable, disable]
}

export function useRecoilToggle(recoilState: RecoilState<boolean>) {
  const [state, setState] = useRecoilState(recoilState)
  const toggle = useCallback(() => setState((state) => !state), [setState])
  const enable = useCallback(() => setState(true), [setState])
  const disable = useCallback(() => setState(false), [setState])
  return { state, setState, toggle, enable, disable }
}
