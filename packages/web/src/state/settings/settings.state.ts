import type { QCRulesConfig } from 'src/algorithms/QC/types'
import { getVirus } from 'src/algorithms/defaults/viruses'

import { detectLocale } from 'src/i18n/detectLocale'
import { DEFAULT_LOCALE_KEY, LocaleKey, localeKeys } from 'src/i18n/i18n'

export interface SettingsState {
  localeKey: LocaleKey
  qcRulesConfig: QCRulesConfig
}

export const settingsDefaultState: SettingsState = {
  localeKey: detectLocale({ defaultLanguage: DEFAULT_LOCALE_KEY, availableLocales: localeKeys }),
  qcRulesConfig: getVirus().qcRulesConfig,
}
