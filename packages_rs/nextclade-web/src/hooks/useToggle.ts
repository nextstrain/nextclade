import { useCallback, useState } from 'react'

export type VoidFunc = () => void

export function useToggle(initialState = false): [boolean, VoidFunc, VoidFunc, VoidFunc] {
  const [state, setState] = useState(initialState)
  const toggle = useCallback(() => setState((state) => !state), [])
  const enable = useCallback(() => setState(true), [])
  const disable = useCallback(() => setState(false), [])
  return [state, toggle, enable, disable]
}
