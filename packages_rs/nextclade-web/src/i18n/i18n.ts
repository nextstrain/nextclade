import { ElementType, FC } from 'react'

import type { StrictOmit } from 'ts-essentials'
import { mapValues } from 'lodash'

import i18nOriginal, { i18n as I18N } from 'i18next'
import { initReactI18next } from 'react-i18next'

import { Settings as LuxonSettings } from 'luxon'
import numbro from 'numbro'
import { languages } from 'countries-list'
import prettyBytesOriginal, { Options as PrettyBytesOptionsOriginal } from 'pretty-bytes'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import numbroLanguages from 'numbro/dist/languages.min'

import GB from 'flag-icon-css/flags/1x1/gb.svg'
import SA from 'flag-icon-css/flags/1x1/sa.svg'
import DE from 'flag-icon-css/flags/1x1/de.svg'
import ES from 'flag-icon-css/flags/1x1/es.svg'
import FR from 'flag-icon-css/flags/1x1/fr.svg'
import IT from 'flag-icon-css/flags/1x1/it.svg'
import KR from 'flag-icon-css/flags/1x1/kr.svg'
import PT from 'flag-icon-css/flags/1x1/pt.svg'
import RU from 'flag-icon-css/flags/1x1/ru.svg'
import CN from 'flag-icon-css/flags/1x1/cn.svg'

import en from './resources/en/common.json'
import ar from './resources/ar/common.json'
import de from './resources/de/common.json'
import es from './resources/es/common.json'
import fr from './resources/fr/common.json'
import it from './resources/it/common.json'
import ko from './resources/ko/common.json'
import pt from './resources/pt/common.json'
import ru from './resources/ru/common.json'
import zh from './resources/zh/common.json'

export const localized = { number: '{{value, localizedNumber}}' } as const
export const translations = { en, ar, de, es, fr, it, ko, pt, ru, zh }
export const flags = new Map()

export type LocaleKey = keyof typeof translations

export const DEFAULT_LOCALE_KEY: LocaleKey = 'en'
export const resources = mapValues(translations, (value) => ({ translation: value }))

export interface Locale {
  readonly key: LocaleKey
  readonly full: string
  readonly name: string
  readonly Flag: ElementType
}

export const locales: Record<LocaleKey, Locale> = {
  en: { key: 'en', full: 'en-US', name: languages.en.native, Flag: GB as FC },
  ar: { key: 'ar', full: 'ar-SA', name: languages.ar.native, Flag: SA as FC },
  de: { key: 'de', full: 'de-DE', name: languages.de.native, Flag: DE as FC },
  es: { key: 'es', full: 'es-ES', name: languages.es.native, Flag: ES as FC },
  fr: { key: 'fr', full: 'fr-FR', name: languages.fr.native, Flag: FR as FC },
  it: { key: 'it', full: 'it-IT', name: languages.it.native, Flag: IT as FC },
  ko: { key: 'ko', full: 'ko-KR', name: languages.ko.native, Flag: KR as FC },
  pt: { key: 'pt', full: 'pt-PT', name: languages.pt.native, Flag: PT as FC },
  ru: { key: 'ru', full: 'ru-RU', name: languages.ru.native, Flag: RU as FC },
  zh: { key: 'zh', full: 'zh-CN', name: languages.zh.native, Flag: CN as FC },
} as const

export const localeKeys = Object.keys(locales)

export const localesArray: Locale[] = Object.values(locales)

export interface I18NInitParams {
  localeKey: LocaleKey
}

export type PrettyBytesOptions = StrictOmit<PrettyBytesOptionsOriginal, 'locale'>

export class PrettyBytes {
  private localeKey: LocaleKey = DEFAULT_LOCALE_KEY

  public setLocale(localeKey: LocaleKey) {
    this.localeKey = localeKey
  }

  public format(numBytes: number, options?: PrettyBytesOptions) {
    return prettyBytesOriginal(numBytes, { binary: true, ...options, locale: this.localeKey })
  }
}

const prettyBytes = new PrettyBytes()

export function i18nInit({ localeKey }: I18NInitParams) {
  const enUS = numbro.languages()['en-US']
  const allNumbroLanguages = numbroLanguages as numbro.NumbroLanguage[]
  Object.values(allNumbroLanguages).forEach((languageRaw) => {
    // If a language object lacks some of the features, substitute these features from English
    numbro.registerLanguage({ ...enUS, ...languageRaw })
  })

  const i18n = i18nOriginal.use(initReactI18next).createInstance({
    resources,
    lng: DEFAULT_LOCALE_KEY,
    fallbackLng: DEFAULT_LOCALE_KEY,
    debug: process.env.DEV_ENABLE_I18N_DEBUG === '1',
    keySeparator: false, // Disable dots as key separators as we use dots in keys
    nsSeparator: false,
    interpolation: { escapeValue: false },
  })

  // eslint-disable-next-line no-void
  void i18n.init()

  const locale = locales[localeKey]
  LuxonSettings.defaultLocale = localeKey
  numbro.setLanguage(locale.full)

  return i18n
}

export function getLocaleWithKey(key: LocaleKey) {
  return { ...locales[key], key }
}

export async function changeLocale(i18n: I18N, localeKey: LocaleKey) {
  if (localeKeys.includes(localeKey)) {
    const locale = locales[localeKey]
    LuxonSettings.defaultLocale = localeKey
    numbro.setLanguage(locale.full)
    await i18n.changeLanguage(localeKey)
    prettyBytes.setLocale(localeKey)
    return true
  }
  return false
}

const i18n = i18nInit({ localeKey: DEFAULT_LOCALE_KEY })

export { prettyBytes }

export default i18n

export { default as numbro } from 'numbro'
