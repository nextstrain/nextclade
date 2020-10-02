import type { QCRulesConfig } from 'src/algorithms/QC/types'
import { getVirus } from 'src/algorithms/defaults/viruses'

import { DEFAULT_LOCALE_KEY, LocaleKey } from 'src/i18n/i18n'

export interface SettingsState {
  localeKey: LocaleKey
  qcRulesConfig: QCRulesConfig
}

export const settingsDefaultState: SettingsState = {
  localeKey: DEFAULT_LOCALE_KEY,
  qcRulesConfig: getVirus().qcRulesConfig,
}
