declare module 'auspice/src/actions/updateMetadata/updateMetadata' {
  import type { ThunkAction } from 'redux-thunk'
  import type { AnyAction } from 'redux'
  import type { AuspiceState } from 'auspice'

  /** Attribute of the tree nodes in metadata that updates the tree, e.g. the colors of a coloring */
  export interface NewMetadataAttribute {
    key: string
    name?: string
    scaleType?: string
    /** Values of the attribute, by node name */
    strains: Record<string, unknown>
    /** Color of each value */
    colors?: [string, string][]
  }

  export interface NewMetadata {
    /** Whether the user edited the dataset, as the color editor of the legend does */
    edited?: boolean
    attributes?: Record<string, NewMetadataAttribute>
  }

  /** Update node attributes and colorings, as the color editor of the legend and dropped metadata files do */
  export function updateMetadata(
    newMetadata: NewMetadata,
    replace?: boolean,
    treeUpdates?: boolean,
  ): ThunkAction<string, AuspiceState, unknown, AnyAction>
}
