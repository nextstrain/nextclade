import type { AuspiceState } from 'auspice'
// import { createStateFromQueryOrJSONs } from 'auspice/src/actions/recomputeReduxState'
//
// import { locateInTree } from 'src/algorithms/tree/locateInTree'
// import { DEFAULT_ROOT_SEQUENCE } from 'src/algorithms/getRootSeq'
//
// import { getFakeResults } from 'src/assets/data/getFakeResults'

export interface AuspiceFiltersState {
  'author'?: string[]
  'country'?: string[]
  'division'?: string[]
  'host'?: string[]
  'location'?: string[]
  'originating_lab'?: string[]
  'submitting_lab'?: string[]
  'clade_membership'?: string[]
  'QC Status'?: string[]
  'Node type'?: string[]
}

export function getFakeAuspiceState(): AuspiceState {
  // if (process.env.DEBUG_SET_INITIAL_DATA === 'true') {
  //   const results = getFakeResults()
  //   const json = locateInTree(results, DEFAULT_ROOT_SEQUENCE)
  //   return createStateFromQueryOrJSONs({ json, query: {} })
  // }

  return {} as AuspiceState
}

export const auspiceInitialState = getFakeAuspiceState()
