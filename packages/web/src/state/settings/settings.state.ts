import { DEFAULT_LOCALE_KEY, LocaleKey } from 'src/i18n/i18n'
import { getNumThreads } from 'src/helpers/getNumThreads'

export interface SettingsState {
  localeKeyV2: LocaleKey
  showWhatsnewOnUpdate: boolean
  lastVersionSeen: string
  numThreadsV2: number
}

export const settingsDefaultState: SettingsState = {
  localeKeyV2: DEFAULT_LOCALE_KEY,
  showWhatsnewOnUpdate: true,
  lastVersionSeen: '',
  numThreadsV2: getNumThreads(),
}
