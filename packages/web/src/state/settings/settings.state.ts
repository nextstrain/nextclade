import type { QCRulesConfig } from 'src/algorithms/QC/qcRulesConfig'
import { qcRulesConfigDefault } from 'src/algorithms/QC/qcRulesConfig'

import { detectLocale } from 'src/i18n/detectLocale'
import { DEFAULT_LOCALE_KEY, LocaleKey, localeKeys } from 'src/i18n/i18n'

export interface SettingsState {
  localeKey: LocaleKey
  qcRulesConfig: QCRulesConfig
}

export const settingsDefaultState: SettingsState = {
  localeKey: detectLocale({ defaultLanguage: DEFAULT_LOCALE_KEY, availableLocales: localeKeys }),
  qcRulesConfig: qcRulesConfigDefault,
}
