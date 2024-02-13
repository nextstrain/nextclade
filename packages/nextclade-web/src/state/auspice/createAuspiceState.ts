import copy from 'fast-copy'
import type { Action, AnyAction, Dispatch } from 'redux'
import type { AuspiceJsonV2 } from 'auspice'

import { createStateFromQueryOrJSONs } from 'auspice/src/actions/recomputeReduxState'

export function createAuspiceState<A extends Action = AnyAction>(json: AuspiceJsonV2, dispatch: Dispatch<A>) {
  return createStateFromQueryOrJSONs({ json: copy(json), query: {}, dispatch })
}
