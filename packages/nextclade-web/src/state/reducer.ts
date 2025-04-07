import type { AuspiceState } from 'auspice'
import browserDimensions from 'auspice/src/reducers/browserDimensions'
import controls from 'auspice/src/reducers/controls'
import entropy from 'auspice/src/reducers/entropy'
import frequencies from 'auspice/src/reducers/frequencies'
import measurements from 'auspice/src/reducers/measurements'

// BEGIN reducers from auspice
import metadata from 'auspice/src/reducers/metadata'
import narrative from 'auspice/src/reducers/narrative'
import notifications from 'auspice/src/reducers/notifications'
import tree from 'auspice/src/reducers/tree'
import treeToo from 'auspice/src/reducers/treeToo'
import { cloneDeep } from 'lodash'
import { useCallback } from 'react'
import { useDispatch, useStore } from 'react-redux'
import { combineReducers } from 'redux'
// END reducers from auspice
import { auspiceGeneralReducer, auspiceQueryReducer } from './auspice/auspice.reducer'

export type State = AuspiceState

export const AUSPICE_EMPTY_STATE: AuspiceState = { metadata: { colorings: [], displayDefaults: {} } }

export const AUSPICE_RESET_STATE = 'AUSPICE_RESET_STATE' as const

/** Returns function to get current entire auspice redux state */
export function useGetAuspiceState() {
  const store = useStore<AuspiceState | undefined>()
  return useCallback((): AuspiceState | undefined => cloneDeep(store.getState()), [store])
}

/** Returns function to set (replace) entire auspice redux state with a provided one */
export function useSetAuspiceState() {
  const dispatch = useDispatch()
  return useCallback(
    (newState: AuspiceState | undefined) => {
      dispatch({ type: AUSPICE_RESET_STATE, payload: newState })
    },
    [dispatch],
  )
}

const reducers = combineReducers<AuspiceState | undefined>({
  metadata,
  tree,
  frequencies,
  controls,
  entropy,
  browserDimensions,
  notifications,
  narrative,
  treeToo,
  general: auspiceGeneralReducer,
  query: auspiceQueryReducer,
  measurements,
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rootReducer(state: AuspiceState | undefined, action?: any): AuspiceState {
  if (state === undefined) {
    return AUSPICE_EMPTY_STATE
  }

  if (action?.type === AUSPICE_RESET_STATE) {
    return cloneDeep(action.payload)
  }

  return reducers(state, action)
}

export default function createRootReducer() {
  return rootReducer
}
