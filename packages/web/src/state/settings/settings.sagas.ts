import { call, takeEvery } from 'redux-saga/effects'

import { Action } from 'typescript-fsa'

import i18nState, { changeLocale, LocaleKey } from 'src/i18n/i18n'
import i18nAuspiceState, { changeAuspiceLocale } from 'src/i18n/i18n.auspice'
import { setLocale } from './settings.actions'

export function* onSetLocale({ payload }: Action<LocaleKey>) {
  const localeKey = payload

  const { i18n } = i18nState
  if (i18n) {
    yield call(changeLocale, i18n, localeKey)
  }

  const { i18nAuspice } = i18nAuspiceState
  if (i18nAuspice) {
    yield call(changeAuspiceLocale, i18nAuspice, localeKey)
  }
}

export default [takeEvery(setLocale, onSetLocale)]
