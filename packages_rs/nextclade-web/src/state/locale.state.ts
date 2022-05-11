import { atom } from 'recoil'
import i18n, { changeLocale, DEFAULT_LOCALE_KEY, getLocaleWithKey, Locale } from 'src/i18n/i18n'
import i18nAuspice, { changeAuspiceLocale } from 'src/i18n/i18n.auspice'

export const localeAtom = atom<Locale>({
  key: 'localeKey',
  default: getLocaleWithKey(DEFAULT_LOCALE_KEY),
  effects: [
    function setLocale({ onSet }) {
      onSet((locale) => {
        Promise.all([changeLocale(i18n, locale.key), changeAuspiceLocale(i18nAuspice, locale.key)]).catch(console.error)
      })
    },
  ],
})
