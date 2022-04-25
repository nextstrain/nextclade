import { atom } from 'recoil'
import { DEFAULT_LOCALE_KEY, getLocaleWithKey } from 'src/i18n/i18n'

export const localeAtom = atom({
  key: 'localeKey',
  default: getLocaleWithKey(DEFAULT_LOCALE_KEY),
})
