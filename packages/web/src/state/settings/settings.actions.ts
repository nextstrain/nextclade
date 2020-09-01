import { actionCreatorFactory } from 'src/state/util/fsaActions'

import type { LocaleKey } from 'src/i18n/i18n'
import type { QCRulesConfig } from 'src/algorithms/QC/qcRulesConfig'

const action = actionCreatorFactory('Settings')

export const setLocale = action<LocaleKey>('setLocale')

export const setQcRulesConfig = action<QCRulesConfig>('setQcRulesConfig')
export const resetQcRulesConfig = action('resetQcRulesConfig')
