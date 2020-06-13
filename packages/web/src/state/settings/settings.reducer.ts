import { reducerWithInitialState } from 'typescript-fsa-reducers'

import immerCase from '../util/fsaImmerReducer'

import { setLocale } from './settings.actions'
import { settingsDefaultState } from './settings.state'

export const settingsReducer = reducerWithInitialState(settingsDefaultState).withHandling(
  immerCase(setLocale, (draft, localeKey) => {
    draft.localeKey = localeKey
  }),
)
