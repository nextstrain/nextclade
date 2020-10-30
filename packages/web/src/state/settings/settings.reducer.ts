import { getVirus } from 'src/algorithms/defaults/viruses'
import { reducerWithInitialState } from 'src/state/util/fsaReducer'

import { resetQcRulesConfig, setLocale, setQcRulesConfig } from 'src/state/settings/settings.actions'
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
