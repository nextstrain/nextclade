import type { AuspiceState } from 'auspice'
import { isNil } from 'lodash'
import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { useRecoilValue } from 'recoil'
import { useDynamicImport } from 'src/hooks/useDynamicImport'
import { treeAtom } from 'src/state/results.state'

/**
 * Return the state of the Auspice store of a dataset's tree, which the tree page draws, or `undefined` while there is
 * no tree or the tree code loads. The tree code (Auspice and the store) loads with a dynamic import once the tree is
 * ready, so that pages without a tree do not load it. The state follows each change of the store, such as a filter or
 * a color that the user changes on the tree page
 */
export function useTreeStoreState(datasetName: string): AuspiceState | undefined {
  const tree = useRecoilValue(treeAtom(datasetName))
  const storeModule = useDynamicImport(loadStoreModule, !isNil(tree))
  const store = useMemo(
    () => (isNil(tree) || isNil(storeModule) ? undefined : storeModule.getTreeStore(tree)),
    [storeModule, tree],
  )

  const subscribe = useCallback((onChange: () => void) => store?.subscribe(onChange) ?? noop, [store])
  const getState = useCallback(() => store?.getState(), [store])
  return useSyncExternalStore(subscribe, getState, getState)
}

function loadStoreModule() {
  return import('src/state/store')
}

function noop() {
  return undefined
}
