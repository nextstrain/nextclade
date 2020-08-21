import { set } from 'lodash'

import type { AuspiceJsonV2 } from 'auspice'
import { createStateFromQueryOrJSONs } from 'auspice/src/actions/recomputeReduxState'

export function createAuspiceState(auspiceData: AuspiceJsonV2) {
  const auspiceState = createStateFromQueryOrJSONs({ json: auspiceData, query: {} })

  // HACK: we are about to send the state object from this webworker process to the main process. However, `state.controls.colorScale.scale` is a function.
  // This will not work currently, because transferring between webworker processes uses structured cloning algorithm and functions are not supported.
  // https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm
  // To workaround we unset the function here and set it back again (to a dummy one) on the other side.
  // Ideally, the state should not contain functions. This is something to discuss in auspice upstream.
  set(auspiceState, 'controls.colorScale.scale', undefined)

  return auspiceState
}
