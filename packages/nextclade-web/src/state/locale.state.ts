import { atom } from 'recoil'
import { plausible } from 'src/components/Common/Plausible'
import i18n, { changeLocale, DEFAULT_LOCALE_KEY } from 'src/i18n/i18n'
import i18nAuspice, { changeAuspiceLocale } from 'src/i18n/i18n.auspice'
import { persistAtom } from 'src/state/persist/localStorage'

export const localeAtom = atom<string>({
  key: 'localeKey',
  default: DEFAULT_LOCALE_KEY,
  effects: [
    function setLocale({ onSet }) {
      onSet((localeKey) => {
        Promise.all([
          changeLocale(i18n, localeKey),
          changeAuspiceLocale(i18nAuspice, localeKey),
          () => {
            plausible('Locale change', { props: { localeKey } })
          },
        ]).catch(console.error)
      })
    },
    persistAtom,
  ],
})
