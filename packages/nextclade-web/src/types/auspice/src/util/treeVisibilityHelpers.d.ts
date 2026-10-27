declare module 'auspice/src/util/treeVisibilityHelpers' {
  import type { AuspiceControlsState, AuspiceTreeState } from 'auspice'

  /**
   * Return which nodes match the active filters, as the tree draws them: the tips that are in view and match all
   * filters, with the ancestors that connect them. `filtered` is `undefined` when no filter is active
   */
  export function getFilteredAndIdxOfFilteredRoot(
    tree: Pick<AuspiceTreeState, 'nodes'>,
    controls: Pick<AuspiceControlsState, 'filters'>,
    inView: boolean[],
  ): { filtered: boolean[] | undefined; idxOfFilteredRoot: number | undefined } | null
}
