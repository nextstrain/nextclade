declare module 'auspice/src/actions/tree' {
  import type { ThunkAction } from 'redux-thunk'
  import type { AnyAction } from 'redux'
  import type { AuspiceDistanceMeasure, AuspiceState } from 'auspice'

  type AuspiceThunk = ThunkAction<void, AuspiceState, unknown, AnyAction>

  /**
   * Change the values of a filter: `add` and `inactivate` values, `remove` them, `set` the filter to the given values,
   * or `focus` on them (activate the given values and inactivate the others)
   */
  export function applyFilter(
    mode: 'add' | 'inactivate' | 'remove' | 'set' | 'focus',
    trait: string | symbol,
    values: string[],
  ): AuspiceThunk

  /** Zoom the main tree and the second tree to the nodes of the given indices; `undefined` keeps a tree's zoom */
  export function updateVisibleTipsAndBranchThicknesses(params?: {
    root?: [number | undefined, number | undefined]
  }): AuspiceThunk

  /** Explode the tree by the given attribute, or rebuild the unexploded tree for `undefined` */
  export function explodeTree(attr: string | undefined): AuspiceThunk

  /** Show the trees with the given branch length measure */
  export function changeDistanceMeasure(metric: AuspiceDistanceMeasure): AuspiceThunk

  /** Remove the second tree, and offer the branch length measures of the main tree again */
  export function removeSecondTree(): AuspiceThunk
}
