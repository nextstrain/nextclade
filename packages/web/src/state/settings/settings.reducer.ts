import { reducerWithInitialState } from 'src/state/util/fsaReducer'

import { qcRulesConfigDefault } from 'src/algorithms/QC/qcRulesConfig'
import { resetQcRulesConfig, setLocale, setQcRulesConfig } from 'src/state/settings/settings.actions'
import { settingsDefaultState } from 'src/state/settings/settings.state'

export const settingsReducer = reducerWithInitialState(settingsDefaultState)
  .icase(setLocale, (draft, localeKey) => {
    draft.localeKey = localeKey
  })

  .icase(setQcRulesConfig, (draft, qcRulesConfig) => {
    draft.qcRulesConfig = qcRulesConfig
  })

  .icase(resetQcRulesConfig, (draft) => {
    draft.qcRulesConfig = qcRulesConfigDefault
  })
