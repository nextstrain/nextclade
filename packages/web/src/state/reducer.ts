import { combineReducers } from 'redux'
import { persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'

import { SettingsState } from './settings/settings.state'
import { settingsReducer } from './settings/settings.reducer'

export interface State {
  settings: SettingsState
}

const SETTINGS_VERSION = 1
const settingsReducerPersisted = persistReducer(
  { key: 'settings', version: SETTINGS_VERSION, storage, timeout: 3000 },
  settingsReducer,
)

const rootReducer = () =>
  combineReducers({
    settings: settingsReducerPersisted,
  })

export default rootReducer
