import { reducerWithInitialState } from 'typescript-fsa-reducers'

import immerCase from '../util/fsaImmerReducer'

import { setLocale } from '../settings/settings.actions'

export const auspiceGeneralReducer = reducerWithInitialState({ language: 'en' }).withHandling(
  immerCase(setLocale, (draft, localeKey) => {
    draft.language = localeKey
  }),
)

export const auspiceQueryReducer = reducerWithInitialState({})
