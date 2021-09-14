import { reducerWithInitialState } from 'src/state/util/fsaReducer'

import {
  resetNumThreads,
  setLastVersionSeen,
  setLocale,
  setNumThreads,
  setShowWhatsnewOnUpdate,
} from 'src/state/settings/settings.actions'
import { settingsDefaultState } from 'src/state/settings/settings.state'
import { getNumThreads } from 'src/helpers/getNumThreads'

export const settingsReducer = reducerWithInitialState(settingsDefaultState)
  .icase(setLocale, (draft, localeKey) => {
    draft.localeKeyV2 = localeKey
  })

  .icase(setShowWhatsnewOnUpdate, (draft, showWhatsnewOnUpdate) => {
    draft.showWhatsnewOnUpdate = showWhatsnewOnUpdate
  })

  .icase(setLastVersionSeen, (draft, lastVersionSeen) => {
    draft.lastVersionSeen = lastVersionSeen
  })

  .icase(setNumThreads, (draft, numThreads) => {
    draft.numThreadsV2 = numThreads
  })

  .icase(resetNumThreads, (draft) => {
    draft.numThreadsV2 = getNumThreads()
  })
