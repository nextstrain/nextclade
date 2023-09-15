import type { StrictOmit } from 'ts-essentials'
import { get, isNil, mapValues } from 'lodash'
import i18nOriginal, { i18n as I18N, Resource } from 'i18next'
import { initReactI18next } from 'react-i18next'
import { Settings as LuxonSettings } from 'luxon'
import numbro from 'numbro'
import { languages } from 'countries-list'
import prettyBytesOriginal, { Options as PrettyBytesOptionsOriginal } from 'pretty-bytes'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import numbroLanguages from 'numbro/dist/languages.min'

import ar from './resources/ar/common.json'
import de from './resources/de/common.json'
import el from './resources/el/common.json'
import en from './resources/en/common.json'
import es from './resources/es/common.json'
import fa from './resources/fa/common.json'
import fr from './resources/fr/common.json'
import he from './resources/he/common.json'
import hi from './resources/hi/common.json'
import id from './resources/id/common.json'
import it from './resources/it/common.json'
import ja from './resources/ja/common.json'
import ko from './resources/ko/common.json'
import nl from './resources/nl/common.json'
import pt from './resources/pt/common.json'
import ru from './resources/ru/common.json'
import ta from './resources/ta/common.json'
import th from './resources/th/common.json'
import tr from './resources/tr/common.json'
import ur from './resources/ur/common.json'
import vi from './resources/vi/common.json'
import zh from './resources/zh/common.json'

export const localized = { number: '{{value, localizedNumber}}' } as const
export const translations = {
  ar,
  de,
  el,
  en,
  es,
  fa,
  fr,
  he,
  hi,
  id,
  it,
  ja,
  ko,
  nl,
  pt,
  ru,
  ta,
  th,
  tr,
  ur,
  vi,
  zh,
}
export const flags = new Map()

export type LocaleKey = keyof typeof translations

export const DEFAULT_LOCALE_KEY: LocaleKey = 'en'
export const resources: Record<LocaleKey, Resource> = mapValues(translations, (value) => ({ translation: value }))

export interface Locale {
  readonly key: LocaleKey
  readonly full: string
  readonly name: string
  readonly native: string
  readonly rtl: number | undefined
}

export const locales: Record<LocaleKey, Locale> = {
  en: { key: 'en', full: 'en-US', name: languages.en.name, native: languages.en.native, rtl: languages.en.rtl },
  ar: { key: 'ar', full: 'ar-SA', name: languages.ar.name, native: languages.ar.native, rtl: languages.ar.rtl },
  de: { key: 'de', full: 'de-DE', name: languages.de.name, native: languages.de.native, rtl: languages.de.rtl },
  el: { key: 'el', full: 'el-GR', name: languages.el.name, native: languages.el.native, rtl: languages.el.rtl },
  es: { key: 'es', full: 'es-ES', name: languages.es.name, native: languages.es.native, rtl: languages.es.rtl },
  fa: { key: 'fa', full: 'fa-IR', name: languages.fa.name, native: languages.fa.native, rtl: languages.fa.rtl },
  fr: { key: 'fr', full: 'fr-FR', name: languages.fr.name, native: languages.fr.native, rtl: languages.fr.rtl },
  he: { key: 'he', full: 'he-IL', name: languages.he.name, native: languages.he.native, rtl: languages.he.rtl },
  hi: { key: 'hi', full: 'hi-IN', name: languages.hi.name, native: languages.hi.native, rtl: languages.hi.rtl },
  id: { key: 'id', full: 'id-ID', name: languages.id.name, native: languages.id.native, rtl: languages.id.rtl },
  it: { key: 'it', full: 'it-IT', name: languages.it.name, native: languages.it.native, rtl: languages.it.rtl },
  ja: { key: 'ja', full: 'ja-JP', name: languages.ja.name, native: languages.ja.native, rtl: languages.ja.rtl },
  ko: { key: 'ko', full: 'ko-KR', name: languages.ko.name, native: languages.ko.native, rtl: languages.ko.rtl },
  nl: { key: 'nl', full: 'nl-NL', name: languages.nl.name, native: languages.nl.native, rtl: languages.nl.rtl },
  pt: { key: 'pt', full: 'pt-PT', name: languages.pt.name, native: languages.pt.native, rtl: languages.pt.rtl },
  ru: { key: 'ru', full: 'ru-RU', name: languages.ru.name, native: languages.ru.native, rtl: languages.ru.rtl },
  ta: { key: 'ta', full: 'ta-IN', name: languages.ta.name, native: languages.ta.native, rtl: languages.ta.rtl },
  th: { key: 'th', full: 'th-TH', name: languages.th.name, native: languages.th.native, rtl: languages.th.rtl },
  tr: { key: 'tr', full: 'tr-TR', name: languages.tr.name, native: languages.tr.native, rtl: languages.tr.rtl },
  ur: { key: 'ur', full: 'ur-PK', name: languages.ur.name, native: languages.ur.native, rtl: languages.ur.rtl },
  vi: { key: 'vi', full: 'vi-VN', name: languages.vi.name, native: languages.vi.native, rtl: languages.vi.rtl },
  zh: { key: 'zh', full: 'zh-CN', name: languages.zh.name, native: languages.zh.native, rtl: languages.zh.rtl },
} as const

export const localeKeys = Object.keys(locales)

export const localesArray: Locale[] = Object.values(locales)

export interface I18NInitParams {
  localeKey: LocaleKey
}

export type PrettyBytesOptions = StrictOmit<PrettyBytesOptionsOriginal, 'locale'>

export class PrettyBytes {
  private localeKey: string = DEFAULT_LOCALE_KEY as string

  public setLocale(localeKey: string) {
    this.localeKey = getLocaleWithKey(localeKey).key
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
    lng: localeKey,
    fallbackLng: DEFAULT_LOCALE_KEY,
    debug: process.env.DEV_ENABLE_I18N_DEBUG === '1',
    keySeparator: false, // Disable dots as key separators as we use dots in keys
    nsSeparator: false,
    interpolation: { escapeValue: false },
    initImmediate: true,
  })

  // eslint-disable-next-line no-void
  void i18n.init()

  const locale = locales[localeKey]
  LuxonSettings.defaultLocale = localeKey
  numbro.setLanguage(locale.full)

  return i18n
}

export function getLocaleWithKey(key: string) {
  const locale = get(locales, key) as Locale
  if (isNil(locale)) {
    return { ...locales[DEFAULT_LOCALE_KEY], key: DEFAULT_LOCALE_KEY }
  }
  return locale
}

export async function changeLocale(i18n: I18N, localeKey: string) {
  if (localeKeys.includes(localeKey)) {
    const locale = getLocaleWithKey(localeKey)
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
