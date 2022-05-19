/* eslint-disable unicorn/no-object-as-default-parameter */
import { DEFAULT_LOCALE_KEY } from 'src/i18n/i18n'

export interface AuspiceGeneralState {
  language?: string
}

export function auspiceGeneralReducer(state: AuspiceGeneralState = { language: DEFAULT_LOCALE_KEY }) {
  return state
}

export function auspiceQueryReducer() {
  return {}
}
