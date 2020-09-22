import { combineReducers } from 'redux'
import { persistReducer, PersistedState } from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import { routerReducer } from 'connected-next-router'
import { RouterState } from 'connected-next-router/types'

// BEGIN reducers from auspice
import type { AuspiceState } from 'auspice'
import metadata from 'auspice/src/reducers/metadata'
import tree from 'auspice/src/reducers/tree'
import frequencies from 'auspice/src/reducers/frequencies'
import entropy from 'auspice/src/reducers/entropy'
import controls from 'auspice/src/reducers/controls'
import browserDimensions from 'auspice/src/reducers/browserDimensions'
import notifications from 'auspice/src/reducers/notifications'
import narrative from 'auspice/src/reducers/narrative'
import treeToo from 'auspice/src/reducers/treeToo'
// END reducers from auspice

import { algorithmReducer } from './algorithm/algorithm.reducer'
import { AlgorithmState } from './algorithm/algorithm.state'

import { SettingsState } from './settings/settings.state'
import { settingsReducer } from './settings/settings.reducer'

import { uiReducer } from './ui/ui.reducer'
import { UiState } from './ui/ui.state'

import { errorReducer, ErrorState } from './error/error.reducer'

import { auspiceGeneralReducer, auspiceQueryReducer } from './auspice/auspice.reducer'

export interface State extends AuspiceState {
  algorithm: AlgorithmState
  settings: SettingsState & PersistedState
  router: RouterState
  ui: UiState
  error: ErrorState
}

const SETTINGS_VERSION = 1
const settingsReducerPersisted = persistReducer(
  { key: 'settings', version: SETTINGS_VERSION, storage, timeout: 3000 },
  settingsReducer,
)

const rootReducer = () =>
  combineReducers({
    algorithm: algorithmReducer,
    settings: settingsReducerPersisted,
    router: routerReducer,
    ui: uiReducer,
    error: errorReducer,

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
    // END reducers from auspice
  })

export default rootReducer
