/* eslint-disable only-ascii/only-ascii */
import { ElementType } from 'react'

import { mapValues } from 'lodash'

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import moment from 'moment'
import numbro from 'numbro'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import numbroLanguages from 'numbro/dist/languages.min'

import { ReactComponent as GB } from 'flag-icon-css/flags/1x1/gb.svg'
import { ReactComponent as DE } from 'flag-icon-css/flags/1x1/de.svg'
import { ReactComponent as FR } from 'flag-icon-css/flags/1x1/fr.svg'

import en from './resources/en/common.json'
import de from './resources/de/common.json'
import fr from './resources/fr/common.json'

export const localized = { number: '{{value, localizedNumber}}' } as const
export const translations = { en, de, fr }
export const flags = new Map()

export type LocaleKey = keyof typeof translations

export const DEFAULT_LOCALE_KEY: LocaleKey = 'en'
export const resources = mapValues(translations, (value) => ({ translation: value }))
export const localeKeys = Object.keys(translations) as LocaleKey[]

export interface Locale {
  readonly full: string
  readonly flag: string
  readonly name: string
  readonly Flag: ElementType
}

export interface LocaleWithKey extends Locale {
  key: LocaleKey
}

export const locales: Record<LocaleKey, Locale> = {
  en: { full: 'en-US', flag: 'us', name: 'English', Flag: GB },
  de: { full: 'de-DE', flag: 'de', name: 'Deutsch', Flag: DE },
  fr: { full: 'fr-FR', flag: 'fr', name: 'Français', Flag: FR },
} as const

export const localesArray: LocaleWithKey[] = Object.entries(locales).map(([key, value]) => ({
  ...value,
  key: key as LocaleKey,
}))

export interface I18NInitParams {
  localeKey: LocaleKey
}

export async function i18nInit({ localeKey }: I18NInitParams) {
  const enUS = numbro.languages()['en-US']
  const allNumbroLanguages = numbroLanguages as numbro.NumbroLanguage
  Object.values(allNumbroLanguages).forEach((languageRaw) => {
    // If a language object lacks some of the features, substitute these features from English
    numbro.registerLanguage({ ...enUS, ...languageRaw })
  })

  await i18n.use(initReactI18next).init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    debug: process.env.DEV_ENABLE_I18N_DEBUG === '1',
    keySeparator: false, // Disable dots as key separators as we use dots in keys
    nsSeparator: false,

    interpolation: {
      escapeValue: false,
      format<V, F, L>(value: V, format: F, lng: L) {
        return value
      },
    },

    react: {
      useSuspense: true,
    },
  })

  await changeLocale(localeKey)

  return i18n
}

export function getLocaleWithKey(key: LocaleKey) {
  return { ...locales[key], key }
}

export async function changeLocale(localeKey: LocaleKey) {
  const locale = locales[localeKey]
  moment.locale(localeKey)
  numbro.setLanguage(locale.full)
  return i18n.changeLanguage(localeKey)
}

export { numbro }

export default i18n
