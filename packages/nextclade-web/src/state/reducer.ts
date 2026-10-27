import { cloneDeep, difference, isEqual, union } from 'lodash'
import { useCallback } from 'react'
import { AnyAction, combineReducers } from 'redux'
import { useDispatch, useStore } from 'react-redux'
import type { AuspiceState } from 'auspice'
import { CLEAN_START, REMOVE_TREE_TOO, TOGGLE_PANEL_DISPLAY, UPDATE_METADATA } from 'auspice/src/actions/types'
import { hasMultipleGridPanels } from 'auspice/src/actions/panelDisplay'

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

export const AUSPICE_EMPTY_STATE: AuspiceState = { metadata: { colorings: {}, displayDefaults: {} } }

export const AUSPICE_RESET_STATE = 'AUSPICE_RESET_STATE' as const

export const HIDE_PANELS = 'HIDE_PANELS' as const

/** Action: hide panels and keep them hidden, as if the user turned them off, e.g. a map that the browser cannot draw */
export function hidePanels(panels: string[]): HidePanelsAction {
  return { type: HIDE_PANELS, panels }
}

export interface HidePanelsAction {
  type: typeof HIDE_PANELS
  panels: string[]
}

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
  // Set by `keepPanelsChosenByUser()`, which needs the controls of the whole state
  panelsHiddenByUser: (panels: string[] = []) => panels,
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rootReducer(state: AuspiceState | undefined, action?: any): AuspiceState {
  if (state === undefined) {
    return AUSPICE_EMPTY_STATE
  }

  if (action?.type === AUSPICE_RESET_STATE) {
    return cloneDeep(action.payload)
  }

  return keepPanelsChosenByUser(state, reducers(state, action), action)
}

/** Panels that Auspice hides while a second tree is shown (`updateSecondTree()` in `src/actions/recomputeReduxState.js`) */
const PANELS_HIDDEN_NEXT_TO_SECOND_TREE = new Set(['map', 'entropy', 'frequencies'])

/**
 * Panels shown after the actions on which Auspice would turn every available panel on, and after hiding panels, in
 * Auspice's order
 */
const PANELS_AFTER_ACTION: Record<string, (previous: AuspiceState, next: AuspiceState, hidden: string[]) => string[]> =
  {
    [UPDATE_METADATA]: (previous, next, hidden) => {
      const previousAvailable = previous.controls?.panelsAvailable ?? []
      const previousShown = previous.controls?.panelsToDisplay ?? []
      const hasSecondTree = !!next.controls?.showTreeToo
      return (next.controls?.panelsAvailable ?? []).filter(
        (panel) =>
          previousShown.includes(panel) ||
          (!previousAvailable.includes(panel) &&
            !hidden.includes(panel) &&
            !(hasSecondTree && PANELS_HIDDEN_NEXT_TO_SECOND_TREE.has(panel))),
      )
    },
    [REMOVE_TREE_TOO]: (_previous, next, hidden) =>
      (next.controls?.panelsAvailable ?? []).filter((panel) => !hidden.includes(panel)),
    [HIDE_PANELS]: (_previous, next, hidden) =>
      (next.controls?.panelsToDisplay ?? []).filter((panel) => !hidden.includes(panel)),
  }

/**
 * Keep the user's choice of the panels. Auspice decides which panels are available, and turns every available panel on
 * when metadata is added and when the second tree is removed. Here a panel that the user turned off stays off instead,
 * and a panel that was on before the second tree is on again after it. A panel that becomes available for the first
 * time turns on, as in Auspice: the map, when added metadata has coordinates, unless a second tree is shown, next to
 * which Auspice shows no map.
 *
 * The panel layout follows Auspice's rules: the user switches between the full layout and the grid while more than one
 * shown panel can take part in the grid. The tree page offers the grid for one tree only, as Auspice does.
 */
function keepPanelsChosenByUser(
  previous: AuspiceState,
  next: AuspiceState,
  action: AnyAction | undefined,
): AuspiceState {
  const { controls } = next
  if (!controls?.panelsToDisplay || !controls.panelsAvailable) {
    return next
  }
  const panelsHiddenByUser = updatePanelsHiddenByUser(previous, next, action)
  const panelsToDisplay =
    PANELS_AFTER_ACTION[String(action?.type)]?.(previous, next, panelsHiddenByUser) ?? controls.panelsToDisplay
  const canTogglePanelLayout = !controls.showTreeToo && hasMultipleGridPanels(panelsToDisplay)
  const panelLayout = canTogglePanelLayout ? controls.panelLayout : 'full'
  if (
    isEqual(panelsHiddenByUser, next.panelsHiddenByUser) &&
    isEqual(panelsToDisplay, controls.panelsToDisplay) &&
    canTogglePanelLayout === controls.canTogglePanelLayout &&
    panelLayout === controls.panelLayout
  ) {
    return next
  }
  return {
    ...next,
    controls: { ...controls, panelsToDisplay, canTogglePanelLayout, panelLayout },
    panelsHiddenByUser,
  }
}

/**
 * Return the panels that the user turned off. At the start, the available panels that the tree does not show by default
 * count as turned off. Only the panel toggles and hidden panels change them: the panels that Auspice hides next to a
 * second tree are not turned off by the user
 */
function updatePanelsHiddenByUser(previous: AuspiceState, next: AuspiceState, action: AnyAction | undefined): string[] {
  const available = next.controls?.panelsAvailable ?? []
  const shown = next.controls?.panelsToDisplay ?? []
  if (action?.type === CLEAN_START || previous.panelsHiddenByUser === undefined) {
    return difference(available, shown)
  }
  if (isHidePanelsAction(action)) {
    return union(previous.panelsHiddenByUser, action.panels)
  }
  if (action?.type === TOGGLE_PANEL_DISPLAY) {
    const previousShown = previous.controls?.panelsToDisplay ?? []
    const turnedOn = difference(shown, previousShown)
    const turnedOff = difference(previousShown, shown)
    return union(difference(previous.panelsHiddenByUser, turnedOn), turnedOff)
  }
  return previous.panelsHiddenByUser
}

function isHidePanelsAction(action: AnyAction | undefined): action is HidePanelsAction {
  return action?.type === HIDE_PANELS
}

export default function createRootReducer() {
  return rootReducer
}
