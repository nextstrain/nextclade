import { combineReducers } from 'redux'
import { persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import { routerReducer } from 'connected-next-router'
import { RouterState } from 'connected-next-router/types'

import { agorithmReducer } from './algorithm/algorithm.reducer'
import { AlgorithmState } from './algorithm/algorithm.state'

import { SettingsState } from './settings/settings.state'
import { settingsReducer } from './settings/settings.reducer'

import { uiReducer } from './ui/ui.reducer'
import { UiState } from './ui/ui.state'

export interface State {
  algorithm: AlgorithmState
  settings: SettingsState
  router: RouterState
  ui: UiState
}

// router: initialRouterState

const SETTINGS_VERSION = 1
const settingsReducerPersisted = persistReducer(
  { key: 'settings', version: SETTINGS_VERSION, storage, timeout: 3000 },
  settingsReducer,
)

const rootReducer = () =>
  combineReducers({
    algorithm: agorithmReducer,
    settings: settingsReducerPersisted,
    router: routerReducer,
    ui: uiReducer,
  })

export default rootReducer
