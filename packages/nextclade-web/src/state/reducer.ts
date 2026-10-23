import { cloneDeep, isEqual } from 'lodash'
import { useCallback } from 'react'
import { combineReducers } from 'redux'
import { useDispatch, useStore } from 'react-redux'
import type { AuspiceState } from 'auspice'
import { TOGGLE_PANEL_DISPLAY, UPDATE_METADATA } from 'auspice/src/actions/types'

// BEGIN reducers from auspice
import browserDimensions from 'auspice/src/reducers/browserDimensions'
import controls from 'auspice/src/reducers/controls'
import entropy from 'auspice/src/reducers/entropy'
import frequencies from 'auspice/src/reducers/frequencies'
import metadata from 'auspice/src/reducers/metadata'
import narrative from 'auspice/src/reducers/narrative'
import notifications from 'auspice/src/reducers/notifications'
import tree from 'auspice/src/reducers/tree'
import treeToo from 'auspice/src/reducers/tree/treeToo'
import measurements from 'auspice/src/reducers/measurements'
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

  return keepPanelsChosenByUser(state, reducers(state, action), action?.type)
}

/**
 * Show only the panels that the user turned on. Auspice turns panels on by itself: added metadata with coordinates
 * shows the map and every other available panel, and removing the second tree shows all available panels again. The
 * map loads its tiles from a third-party server, which then sees the map area of the user's samples, so only the user
 * turns it on, through the panel toggle of the sidebar. Added metadata turns on no panel. The tree page stacks its
 * panels, so the layout is always the full one
 */
function keepPanelsChosenByUser(previous: AuspiceState, next: AuspiceState, actionType: unknown): AuspiceState {
  const { controls } = next
  if (!controls?.panelsToDisplay) {
    return next
  }
  const previousPanels = previous.controls?.panelsToDisplay ?? []
  let panelsToDisplay = controls.panelsToDisplay
  if (actionType === UPDATE_METADATA) {
    panelsToDisplay = previousPanels
  } else if (actionType !== TOGGLE_PANEL_DISPLAY && !previousPanels.includes('map')) {
    panelsToDisplay = panelsToDisplay.filter((panel) => panel !== 'map')
  }
  if (
    isEqual(panelsToDisplay, controls.panelsToDisplay) &&
    controls.panelLayout === 'full' &&
    controls.canTogglePanelLayout === false
  ) {
    return next
  }
  return { ...next, controls: { ...controls, panelsToDisplay, panelLayout: 'full', canTogglePanelLayout: false } }
}

export default function createRootReducer() {
  return rootReducer
}
