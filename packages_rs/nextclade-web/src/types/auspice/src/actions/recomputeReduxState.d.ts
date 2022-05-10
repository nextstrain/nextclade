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
}
