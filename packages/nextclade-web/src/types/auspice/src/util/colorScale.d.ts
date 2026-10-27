declare module 'auspice/src/util/colorScale' {
  import type { AuspiceControlsState, AuspiceMetadataState, AuspiceTreeState } from 'auspice'

  /** Color scale of a coloring of the tree */
  export interface AuspiceColorScale {
    /** Return the color of a value. A missing value, or a value that the coloring does not know, gets grey */
    scale: (value: string | number | undefined) => string
  }

  /** Return the color scale that the tree uses when the user colors it by the attribute `colorBy` */
  export function calcColorScale(
    colorBy: string,
    controls: AuspiceControlsState,
    tree: AuspiceTreeState,
    treeToo: AuspiceTreeState | undefined,
    metadata: AuspiceMetadataState,
  ): AuspiceColorScale
}
