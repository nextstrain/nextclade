import type { AuspiceJsonV2 } from 'auspice'
import { createStateFromQueryOrJSONs } from 'auspice/src/actions/recomputeReduxState'

export function createAuspiceState(auspiceData: AuspiceJsonV2) {
  return createStateFromQueryOrJSONs({ json: auspiceData, query: {} })
}
