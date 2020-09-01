import { takeEvery, call } from 'redux-saga/effects'

import { Action } from 'src/state/util/fsaActions'

import i18n, { changeLocale, LocaleKey } from 'src/i18n/i18n'
import i18nAuspice, { changeAuspiceLocale } from 'src/i18n/i18n.auspice'
import { setLocale } from './settings.actions'

export function* onSetLocale({ payload }: Action<LocaleKey>) {
  const localeKey = payload
  yield call(changeLocale, i18n, localeKey)
  yield call(changeAuspiceLocale, i18nAuspice, localeKey)
}

export default [takeEvery(setLocale, onSetLocale)]
