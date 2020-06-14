import { combineReducers } from 'redux'
import { persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import { routerReducer } from 'connected-next-router'
import { RouterState } from 'connected-next-router/types'

import { SettingsState } from './settings/settings.state'
import { settingsReducer } from './settings/settings.reducer'

export interface State {
  settings: SettingsState
  router: RouterState
}

// router: initialRouterState

const SETTINGS_VERSION = 1
const settingsReducerPersisted = persistReducer(
  { key: 'settings', version: SETTINGS_VERSION, storage, timeout: 3000 },
  settingsReducer,
)

const rootReducer = () =>
  combineReducers({
    settings: settingsReducerPersisted,
    router: routerReducer,
  })

export default rootReducer
