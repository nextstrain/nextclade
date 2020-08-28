import { reducerWithInitialState } from 'typescript-fsa-reducers'

import { qcRulesConfigDefault } from 'src/algorithms/QC/qcRulesConfig'
import immerCase from 'src/state/util/fsaImmerReducer'

import { resetQcRulesConfig, setLocale, setQcRulesConfig } from './settings.actions'
import { settingsDefaultState } from './settings.state'

export const settingsReducer = reducerWithInitialState(settingsDefaultState)
  .withHandling(
    immerCase(setLocale, (draft, localeKey) => {
      draft.localeKey = localeKey
    }),
  )

  .withHandling(
    immerCase(setQcRulesConfig, (draft, qcRulesConfig) => {
      draft.qcRulesConfig = qcRulesConfig
    }),
  )

  .withHandling(
    immerCase(resetQcRulesConfig, (draft) => {
      draft.qcRulesConfig = qcRulesConfigDefault
    }),
  )
