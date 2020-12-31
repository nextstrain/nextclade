import { actionCreatorFactory } from 'src/state/util/fsaActions'

import type { LocaleKey } from 'src/i18n/i18n'
import type { QCRulesConfig } from 'src/algorithms/QC/types'

const action = actionCreatorFactory('Settings')

export const setLocale = action<LocaleKey>('setLocale')

export const setQcRulesConfig = action<QCRulesConfig>('setQcRulesConfig')

export const resetQcRulesConfig = action('resetQcRulesConfig')

export const setLastVersionSeen = action<string>('setLastVersionSeen')

export const setShowWhatsnew = action<boolean>('setShowWhatsnew')

export const setShowWhatsnewOnUpdate = action<boolean>('setShowWhatsnewOnUpdate')

export const setShowAdvancedControls = action<boolean>('setShowAdvancedControls')
