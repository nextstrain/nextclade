import { getVirus } from 'src/algorithms/defaults/viruses'
import { reducerWithInitialState } from 'src/state/util/fsaReducer'

import {
  resetQcRulesConfig,
  setLastVersionSeen,
  setLocale,
  setQcRulesConfig,
  setShowAdvancedControls,
  setShowWhatsnewOnUpdate,
} from 'src/state/settings/settings.actions'
import { settingsDefaultState } from 'src/state/settings/settings.state'

export const settingsReducer = reducerWithInitialState(settingsDefaultState)
  .icase(setLocale, (draft, localeKey) => {
    draft.localeKeyV2 = localeKey
  })

  .icase(setQcRulesConfig, (draft, qcRulesConfig) => {
    draft.qcRulesConfig = qcRulesConfig
  })

  .icase(resetQcRulesConfig, (draft) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('TODO: remove this action')
    }
    draft.qcRulesConfig = getVirus().qcRulesConfig
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
