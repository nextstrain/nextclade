import type { Router } from 'next/router'

import { configureStore } from 'src/state/store'
import { setLocale } from 'src/state/settings/settings.actions'
import { showWhatsNewMaybe } from 'src/helpers/showWhatsNewMaybe'

export interface InitializeParams {
  router: Router
}

const allowResultsPage = process.env.NODE_ENV === 'development' && process.env.DEBUG_SET_INITIAL_DATA === 'true'

export async function initialize({ router }: InitializeParams) {
  if (!allowResultsPage && router.pathname === '/results') {
    await router.replace('/')
  }

  void router.prefetch('/') // eslint-disable-line no-void
  void router.prefetch('/results') // eslint-disable-line no-void

  const { persistor, store } = await configureStore({ router })

  const { localeKeyV2, lastVersionSeen, showWhatsnewOnUpdate } = store.getState().settings
  store.dispatch(setLocale(localeKeyV2))

  showWhatsNewMaybe(lastVersionSeen, showWhatsnewOnUpdate, store.dispatch)

  return { persistor, store }
}
