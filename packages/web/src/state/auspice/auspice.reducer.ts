import { reducerWithInitialState } from 'typescript-fsa-reducers'

import immerCase from 'src/state/util/fsaImmerReducer'

import { setLocale } from 'src/state/settings/settings.actions'

export const auspiceGeneralReducer = reducerWithInitialState<{ language?: string }>({ language: 'en' }).withHandling(
  immerCase(setLocale, (draft, localeKey) => {
    draft.language = localeKey
  }),
)

export const auspiceQueryReducer = reducerWithInitialState({})
