import { useEffect, useState } from 'react'
import { useSetRecoilState } from 'recoil'
import { sanitizeError } from 'src/helpers/sanitizeError'
import { globalErrorAtom } from 'src/state/error.state'

/**
 * Return the module that `load` imports dynamically, or `undefined` until it has loaded. The import starts when
 * `enabled` first becomes true, so that a page loads the module only when it needs it. `load` must keep its identity
 * between renders, for example a function at module level
 */
export function useDynamicImport<Module>(load: () => Promise<Module>, enabled: boolean): Module | undefined {
  const setGlobalError = useSetRecoilState(globalErrorAtom)
  const [loaded, setLoaded] = useState<Module>()

  useEffect(() => {
    if (!enabled || loaded !== undefined) {
      return undefined
    }
    let isCurrent = true
    load()
      .then((module) => {
        if (isCurrent) {
          setLoaded(() => module)
        }
      })
      .catch((error: unknown) => setGlobalError(sanitizeError(error)))
    return () => {
      isCurrent = false
    }
  }, [enabled, load, loaded, setGlobalError])

  return loaded
}
