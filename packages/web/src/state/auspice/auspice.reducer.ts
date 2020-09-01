import { reducerWithInitialState } from 'src/state/util/fsaReducer'

import { setLocale } from 'src/state/settings/settings.actions'

export const auspiceGeneralReducer = reducerWithInitialState<{ language?: string }>({ language: 'en' }) // prettier-ignore
  .icase(setLocale, (draft, localeKey) => {
    draft.language = localeKey
  })

export const auspiceQueryReducer = reducerWithInitialState({})
