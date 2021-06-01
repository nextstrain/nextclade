import { DEFAULT_LOCALE_KEY, LocaleKey } from 'src/i18n/i18n'

export interface SettingsState {
  localeKeyV2: LocaleKey
  showWhatsnewOnUpdate: boolean
  lastVersionSeen: string
  showAdvancedControls: boolean
}

export const settingsDefaultState: SettingsState = {
  localeKeyV2: DEFAULT_LOCALE_KEY,
  showWhatsnewOnUpdate: true,
  lastVersionSeen: '',
  showAdvancedControls: false,
}
