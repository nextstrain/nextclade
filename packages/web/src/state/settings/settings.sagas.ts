import { takeEvery, call, put } from 'typed-redux-saga'

import { Action } from 'src/state/util/fsaActions'

import i18n, { changeLocale, DEFAULT_LOCALE_KEY, LocaleKey } from 'src/i18n/i18n'
import i18nAuspice, { changeAuspiceLocale } from 'src/i18n/i18n.auspice'
import { setLocale } from './settings.actions'

export function* onSetLocale({ payload }: Action<LocaleKey>) {
  const localeKey = payload

  const localeChangedSuccessfully = yield* call(changeLocale, i18n, localeKey)
  if (!localeChangedSuccessfully) {
    yield* put(setLocale(DEFAULT_LOCALE_KEY))
  }

  yield* call(changeAuspiceLocale, i18nAuspice, localeKey)
}

export default [takeEvery(setLocale, onSetLocale)]
