import { reducerWithInitialState } from 'src/state/util/fsaReducer'

import {
  setLastVersionSeen,
  setLocale,
  setShowAdvancedControls,
  setShowWhatsnewOnUpdate,
} from 'src/state/settings/settings.actions'
import { settingsDefaultState } from 'src/state/settings/settings.state'

export const settingsReducer = reducerWithInitialState(settingsDefaultState)
  .icase(setLocale, (draft, localeKey) => {
    draft.localeKeyV2 = localeKey
  })

  .icase(setShowWhatsnewOnUpdate, (draft, showWhatsnewOnUpdate) => {
    draft.showWhatsnewOnUpdate = showWhatsnewOnUpdate
  })

  .icase(setLastVersionSeen, (draft, lastVersionSeen) => {
    draft.lastVersionSeen = lastVersionSeen
  })

  .icase(setShowAdvancedControls, (draft, showAdvancedControls) => {
    draft.showAdvancedControls = showAdvancedControls
  })
