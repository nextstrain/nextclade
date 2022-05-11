import { combineReducers } from 'redux'

import type { AuspiceState } from 'auspice'

// BEGIN reducers from auspice
import metadata from 'auspice/src/reducers/metadata'
import tree from 'auspice/src/reducers/tree'
import frequencies from 'auspice/src/reducers/frequencies'
import entropy from 'auspice/src/reducers/entropy'
import controls from 'auspice/src/reducers/controls'
import browserDimensions from 'auspice/src/reducers/browserDimensions'
import notifications from 'auspice/src/reducers/notifications'
import narrative from 'auspice/src/reducers/narrative'
import treeToo from 'auspice/src/reducers/treeToo'
import measurements from 'auspice/src/reducers/measurements'
// END reducers from auspice

import { auspiceGeneralReducer, auspiceQueryReducer } from './auspice/auspice.reducer'

export type State = AuspiceState

const rootReducer = () =>
  combineReducers({
    // BEGIN reducers from auspice
    metadata,
    tree,
    frequencies,
    controls,
    entropy,
    browserDimensions,
    notifications,
    narrative,
    treeToo,
    general: auspiceGeneralReducer,
    query: auspiceQueryReducer,
    measurements,
    // END reducers from auspice
  })

export default rootReducer
