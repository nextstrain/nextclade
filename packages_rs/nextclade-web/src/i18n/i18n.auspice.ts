import i18nOriginal, { i18n as I18N } from 'i18next'
import { initReactI18next } from 'react-i18next'

import { DEFAULT_LOCALE_KEY, localeKeys } from 'src/i18n/i18n'

import arSidebar from 'auspice/src/locales/ar/sidebar.json'
import deSidebar from 'auspice/src/locales/de/sidebar.json'
import enSidebar from 'auspice/src/locales/en/sidebar.json'
import esSidebar from 'auspice/src/locales/es/sidebar.json'
import frSidebar from 'auspice/src/locales/fr/sidebar.json'
import itSidebar from 'auspice/src/locales/it/sidebar.json'
import jaSidebar from 'auspice/src/locales/ja/sidebar.json'
import ltSidebar from 'auspice/src/locales/lt/sidebar.json'
import plSidebar from 'auspice/src/locales/pl/sidebar.json'
import ptSidebar from 'auspice/src/locales/pt/sidebar.json'
import ruSidebar from 'auspice/src/locales/ru/sidebar.json'
import trSidebar from 'auspice/src/locales/tr/sidebar.json'

import arTranslation from 'auspice/src/locales/ar/translation.json'
import deTranslation from 'auspice/src/locales/de/translation.json'
import enTranslation from 'auspice/src/locales/en/translation.json'
import esTranslation from 'auspice/src/locales/es/translation.json'
import frTranslation from 'auspice/src/locales/fr/translation.json'
import itTranslation from 'auspice/src/locales/it/translation.json'
import jaTranslation from 'auspice/src/locales/ja/translation.json'
import ltTranslation from 'auspice/src/locales/lt/translation.json'
import plTranslation from 'auspice/src/locales/pl/translation.json'
import ptTranslation from 'auspice/src/locales/pt/translation.json'
import ruTranslation from 'auspice/src/locales/ru/translation.json'
import trTranslation from 'auspice/src/locales/tr/translation.json'

export const AUSPICE_I18N_NAMESPACES = ['language', 'sidebar', 'translation']

export function i18nAuspiceInit() {
  const i18nAuspice = i18nOriginal.use(initReactI18next).createInstance({
    resources: {
      ar: { sidebar: arSidebar, translation: arTranslation },
      de: { sidebar: deSidebar, translation: deTranslation },
      en: { sidebar: enSidebar, translation: enTranslation },
      es: { sidebar: esSidebar, translation: esTranslation },
      fr: { sidebar: frSidebar, translation: frTranslation },
      it: { sidebar: itSidebar, translation: itTranslation },
      ja: { sidebar: jaSidebar, translation: jaTranslation },
      lt: { sidebar: ltSidebar, translation: ltTranslation },
      pl: { sidebar: plSidebar, translation: plTranslation },
      pt: { sidebar: ptSidebar, translation: ptTranslation },
      ru: { sidebar: ruSidebar, translation: ruTranslation },
      tr: { sidebar: trSidebar, translation: trTranslation },
    },
    lng: DEFAULT_LOCALE_KEY,
    fallbackLng: DEFAULT_LOCALE_KEY,
    debug: process.env.DEV_ENABLE_I18N_DEBUG === '1',
    interpolation: { escapeValue: false },
    defaultNS: 'translation',
    initImmediate: true,
  })

  // eslint-disable-next-line no-void
  void i18nAuspice.init()

  return i18nAuspice
}

export async function changeAuspiceLocale(i18nAuspice: I18N, localeKey: string) {
  if (localeKeys.includes(localeKey)) {
    await i18nAuspice.changeLanguage(localeKey)
    return true
  }
  return false
}

const i18nAuspice = i18nAuspiceInit()

export default i18nAuspice
