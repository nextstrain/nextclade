declare module 'auspice/src/actions/panelDisplay' {
  import type { AnyAction } from 'redux'
  import type { ThunkAction } from 'redux-thunk'
  import type { AuspiceState } from 'auspice'

  /** Return the number of the given panels that Auspice lays out in its grid: the tree, the measurements and the map */
  export function numberOfGridPanels(panels: string[]): number
  /** Return whether more than one of the given panels takes part in Auspice's grid */
  export function hasMultipleGridPanels(panels: string[]): boolean
  /** Thunk: show the panel if it is hidden, hide it otherwise */
  export function togglePanelDisplay(panelName: string): ThunkAction<void, AuspiceState, unknown, AnyAction>
}
