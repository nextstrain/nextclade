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

import af from './resources/af/common.json'
import am from './resources/am/common.json'
import ar from './resources/ar/common.json'
import az from './resources/az/common.json'
import bg from './resources/bg/common.json'
import bn from './resources/bn/common.json'
import bs from './resources/bs/common.json'
import ca from './resources/ca/common.json'
import cs from './resources/cs/common.json'
import cy from './resources/cy/common.json'
import da from './resources/da/common.json'
import de from './resources/de/common.json'
import el from './resources/el/common.json'
import en from './resources/en/common.json'
import es from './resources/es/common.json'
import et from './resources/et/common.json'
import fa from './resources/fa/common.json'
import fi from './resources/fi/common.json'
import fr from './resources/fr/common.json'
import ga from './resources/ga/common.json'
import gu from './resources/gu/common.json'
import ha from './resources/ha/common.json'
import he from './resources/he/common.json'
import hi from './resources/hi/common.json'
import hr from './resources/hr/common.json'
import ht from './resources/ht/common.json'
import hu from './resources/hu/common.json'
import hy from './resources/hy/common.json'
import id from './resources/id/common.json'
import is from './resources/is/common.json'
import it from './resources/it/common.json'
import ja from './resources/ja/common.json'
import ka from './resources/ka/common.json'
import kk from './resources/kk/common.json'
import kn from './resources/kn/common.json'
import ko from './resources/ko/common.json'
import lt from './resources/lt/common.json'
import lv from './resources/lv/common.json'
import mk from './resources/mk/common.json'
import ml from './resources/ml/common.json'
import mn from './resources/mn/common.json'
import mr from './resources/mr/common.json'
import ms from './resources/ms/common.json'
import mt from './resources/mt/common.json'
import nl from './resources/nl/common.json'
import no from './resources/no/common.json'
import pa from './resources/pa/common.json'
import pl from './resources/pl/common.json'
import ps from './resources/ps/common.json'
import pt from './resources/pt/common.json'
import ro from './resources/ro/common.json'
import ru from './resources/ru/common.json'
import si from './resources/si/common.json'
import sk from './resources/sk/common.json'
import sl from './resources/sl/common.json'
import so from './resources/so/common.json'
import sq from './resources/sq/common.json'
import sr from './resources/sr/common.json'
import sv from './resources/sv/common.json'
import sw from './resources/sw/common.json'
import ta from './resources/ta/common.json'
import te from './resources/te/common.json'
import th from './resources/th/common.json'
import tl from './resources/tl/common.json'
import tr from './resources/tr/common.json'
import uk from './resources/uk/common.json'
import ur from './resources/ur/common.json'
import uz from './resources/uz/common.json'
import vi from './resources/vi/common.json'
import zh from './resources/zh/common.json'

export const localized = { number: '{{value, localizedNumber}}' } as const

export const translations: Record<string, unknown> = {
  af,
  am,
  ar,
  az,
  bg,
  bn,
  bs,
  ca,
  cs,
  cy,
  da,
  de,
  el,
  en,
  es,
  et,
  fa,
  fi,
  fr,
  ga,
  gu,
  ha,
  he,
  hi,
  hr,
  ht,
  hu,
  hy,
  id,
  is,
  it,
  ja,
  ka,
  kk,
  kn,
  ko,
  lt,
  lv,
  mk,
  ml,
  mn,
  mr,
  ms,
  mt,
  nl,
  no,
  pa,
  pl,
  ps,
  pt,
  ro,
  ru,
  si,
  sk,
  sl,
  so,
  sq,
  sr,
  sv,
  sw,
  ta,
  te,
  th,
  tl,
  tr,
  uk,
  ur,
  uz,
  vi,
  zh,
}

export const flags = new Map()

export type LocaleKey = keyof typeof translations

export const DEFAULT_LOCALE_KEY: LocaleKey = 'en'
export const resources = mapValues(translations, (value) => ({ translation: value })) as Record<LocaleKey, Resource>

export interface Locale {
  readonly key: LocaleKey
  readonly full: string
  readonly name: string
  readonly native: string
  readonly rtl: number | undefined
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
/* @ts-ignore */
export const locales: Record<LocaleKey, Locale> = {
  en: { key: 'en', full: 'en-US', name: languages.en.name, native: languages.en.native, rtl: languages.en.rtl },
  af: { key: 'af', full: 'af-ZA', name: languages.af.name, native: languages.af.native, rtl: languages.af.rtl },
  am: { key: 'am', full: 'am-ET', name: languages.am.name, native: languages.am.native, rtl: languages.am.rtl },
  ar: { key: 'ar', full: 'ar-SA', name: languages.ar.name, native: languages.ar.native, rtl: languages.ar.rtl },
  az: { key: 'az', full: 'az-AZ', name: languages.az.name, native: languages.az.native, rtl: languages.az.rtl },
  bg: { key: 'bg', full: 'bg-BG', name: languages.bg.name, native: languages.bg.native, rtl: languages.bg.rtl },
  bn: { key: 'bn', full: 'bn-IN', name: languages.bn.name, native: languages.bn.native, rtl: languages.bn.rtl },
  bs: { key: 'bs', full: 'bs-BA', name: languages.bs.name, native: languages.bs.native, rtl: languages.bs.rtl },
  ca: { key: 'ca', full: 'ca-ES', name: languages.ca.name, native: languages.ca.native, rtl: languages.ca.rtl },
  cs: { key: 'cs', full: 'cs-CZ', name: languages.cs.name, native: languages.cs.native, rtl: languages.cs.rtl },
  da: { key: 'da', full: 'da-DK', name: languages.da.name, native: languages.da.native, rtl: languages.da.rtl },
  de: { key: 'de', full: 'de-DE', name: languages.de.name, native: languages.de.native, rtl: languages.de.rtl },
  el: { key: 'el', full: 'el-GR', name: languages.el.name, native: languages.el.native, rtl: languages.el.rtl },
  es: { key: 'es', full: 'es-ES', name: languages.es.name, native: languages.es.native, rtl: languages.es.rtl },
  et: { key: 'et', full: 'et-EE', name: languages.et.name, native: languages.et.native, rtl: languages.et.rtl },
  fa: { key: 'fa', full: 'fa-IR', name: languages.fa.name, native: languages.fa.native, rtl: languages.fa.rtl },
  fi: { key: 'fi', full: 'fi-FI', name: languages.fi.name, native: languages.fi.native, rtl: languages.fi.rtl },
  fr: { key: 'fr', full: 'fr-FR', name: languages.fr.name, native: languages.fr.native, rtl: languages.fr.rtl },
  ga: { key: 'ga', full: 'ga-IE', name: languages.ga.name, native: languages.ga.native, rtl: languages.ga.rtl },
  he: { key: 'he', full: 'he-IL', name: languages.he.name, native: languages.he.native, rtl: languages.he.rtl },
  hi: { key: 'hi', full: 'hi-IN', name: languages.hi.name, native: languages.hi.native, rtl: languages.hi.rtl },
  hr: { key: 'hr', full: 'hr-HR', name: languages.hr.name, native: languages.hr.native, rtl: languages.hr.rtl },
  ht: { key: 'ht', full: 'ht-HT', name: languages.ht.name, native: languages.ht.native, rtl: languages.ht.rtl },
  hu: { key: 'hu', full: 'hu-HU', name: languages.hu.name, native: languages.hu.native, rtl: languages.hu.rtl },
  hy: { key: 'hy', full: 'hy-AM', name: languages.hy.name, native: languages.hy.native, rtl: languages.hy.rtl },
  id: { key: 'id', full: 'id-ID', name: languages.id.name, native: languages.id.native, rtl: languages.id.rtl },
  is: { key: 'is', full: 'is-IS', name: languages.is.name, native: languages.is.native, rtl: languages.is.rtl },
  it: { key: 'it', full: 'it-IT', name: languages.it.name, native: languages.it.native, rtl: languages.it.rtl },
  ja: { key: 'ja', full: 'ja-JP', name: languages.ja.name, native: languages.ja.native, rtl: languages.ja.rtl },
  ka: { key: 'ka', full: 'ka-GE', name: languages.ka.name, native: languages.ka.native, rtl: languages.ka.rtl },
  kk: { key: 'kk', full: 'kk-KZ', name: languages.kk.name, native: languages.kk.native, rtl: languages.kk.rtl },
  ko: { key: 'ko', full: 'ko-KR', name: languages.ko.name, native: languages.ko.native, rtl: languages.ko.rtl },
  lt: { key: 'lt', full: 'lt-LT', name: languages.lt.name, native: languages.lt.native, rtl: languages.lt.rtl },
  lv: { key: 'lv', full: 'lv-LV', name: languages.lv.name, native: languages.lv.native, rtl: languages.lv.rtl },
  mk: { key: 'mk', full: 'mk-MK', name: languages.mk.name, native: languages.mk.native, rtl: languages.mk.rtl },
  mn: { key: 'mn', full: 'mn-MN', name: languages.mn.name, native: languages.mn.native, rtl: languages.mn.rtl },
  ms: { key: 'ms', full: 'ms-MY', name: languages.ms.name, native: languages.ms.native, rtl: languages.ms.rtl },
  mt: { key: 'mt', full: 'mt-MT', name: languages.mt.name, native: languages.mt.native, rtl: languages.mt.rtl },
  nl: { key: 'nl', full: 'nl-NL', name: languages.nl.name, native: languages.nl.native, rtl: languages.nl.rtl },
  no: { key: 'no', full: 'no-NO', name: languages.no.name, native: languages.no.native, rtl: languages.no.rtl },
  pa: { key: 'pa', full: 'pa-IN', name: languages.pa.name, native: languages.pa.native, rtl: languages.pa.rtl },
  pl: { key: 'pl', full: 'pl-PL', name: languages.pl.name, native: languages.pl.native, rtl: languages.pl.rtl },
  ps: { key: 'ps', full: 'ps-AF', name: languages.ps.name, native: languages.ps.native, rtl: languages.ps.rtl },
  pt: { key: 'pt', full: 'pt-PT', name: languages.pt.name, native: languages.pt.native, rtl: languages.pt.rtl },
  ro: { key: 'ro', full: 'ro-RO', name: languages.ro.name, native: languages.ro.native, rtl: languages.ro.rtl },
  ru: { key: 'ru', full: 'ru-RU', name: languages.ru.name, native: languages.ru.native, rtl: languages.ru.rtl },
  si: { key: 'si', full: 'si-LK', name: languages.si.name, native: languages.si.native, rtl: languages.si.rtl },
  sk: { key: 'sk', full: 'sk-SK', name: languages.sk.name, native: languages.sk.native, rtl: languages.sk.rtl },
  sl: { key: 'sl', full: 'sl-SI', name: languages.sl.name, native: languages.sl.native, rtl: languages.sl.rtl },
  so: { key: 'so', full: 'so-SO', name: languages.so.name, native: languages.so.native, rtl: languages.so.rtl },
  sq: { key: 'sq', full: 'sq-AL', name: languages.sq.name, native: languages.sq.native, rtl: languages.sq.rtl },
  sr: { key: 'sr', full: 'sr-RS', name: languages.sr.name, native: languages.sr.native, rtl: languages.sr.rtl },
  sv: { key: 'sv', full: 'sv-SE', name: languages.sv.name, native: languages.sv.native, rtl: languages.sv.rtl },
  sw: { key: 'sw', full: 'sw-KE', name: languages.sw.name, native: languages.sw.native, rtl: languages.sw.rtl },
  ta: { key: 'ta', full: 'ta-IN', name: languages.ta.name, native: languages.ta.native, rtl: languages.ta.rtl },
  th: { key: 'th', full: 'th-TH', name: languages.th.name, native: languages.th.native, rtl: languages.th.rtl },
  tr: { key: 'tr', full: 'tr-TR', name: languages.tr.name, native: languages.tr.native, rtl: languages.tr.rtl },
  uk: { key: 'uk', full: 'uk-UA', name: languages.uk.name, native: languages.uk.native, rtl: languages.uk.rtl },
  ur: { key: 'ur', full: 'ur-PK', name: languages.ur.name, native: languages.ur.native, rtl: languages.ur.rtl },
  uz: { key: 'uz', full: 'uz-UZ', name: languages.uz.name, native: languages.uz.native, rtl: languages.uz.rtl },
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
  private localeKey: string = DEFAULT_LOCALE_KEY

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
  const locale = get(locales, key)
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
