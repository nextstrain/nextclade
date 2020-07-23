import type { AuspiceState } from 'auspice'
import { createStateFromQueryOrJSONs } from 'auspice/src/actions/recomputeReduxState'

import { prepareResultsJson } from 'src/io/serializeResults'
import { locateInTree } from 'src/algorithms/tree/locateInTree'
import { DEFAULT_ROOT_SEQUENCE } from 'src/algorithms/getRootSeq'

import { getFakeResults } from 'src/assets/data/getFakeResults'
import auspiceTree from 'src/assets/data/ncov_small.json'

export function getFakeAuspiceState(): AuspiceState {
  if (process.env.DEBUG_SET_INITIAL_DATA === 'true') {
    const results = getFakeResults()
    const data = prepareResultsJson(results)
    const json = locateInTree(data, auspiceTree, DEFAULT_ROOT_SEQUENCE)
    return createStateFromQueryOrJSONs({ json, query: {} })
  }

  return {}
}

export const auspiceInitialState = getFakeAuspiceState()
