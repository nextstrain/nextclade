declare module 'auspice/src/actions/recomputeReduxState' {
  import { Dispatch } from 'redux'
  import { AuspiceJsonV2, AuspiceQuery, AuspiceState } from 'auspice'

  export declare interface CreateStateFromQueryOrJSONsParams {
    json: false | AuspiceJsonV2
    query: AuspiceQuery
    secondTreeDataset?: boolean
    oldState?: AuspiceState
    narrativeBlocks?: boolean
    mainTreeName?: string | false
    secondTreeName?: string | false
    dispatch: Dispatch
  }

  export declare function createStateFromQueryOrJSONs(params: CreateStateFromQueryOrJSONsParams): AuspiceState

  export declare interface CreateTreeTooStateParams {
    json: AuspiceJsonV2
    oldState: AuspiceState
    /** Name of the main tree */
    originalTreeUrl: string
    /** Name of the second tree */
    secondTreeUrl: string
    dispatch: Dispatch
  }

  /** Return the parts of the state that change when a second tree is added to a loaded view, for `TREE_TOO_DATA` */
  export declare function createTreeTooState(params: CreateTreeTooStateParams): Partial<AuspiceState>
}
