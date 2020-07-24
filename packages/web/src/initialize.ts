import type { Router } from 'next/router'

import type { State } from 'src/state/reducer'
import { selectLocaleKey } from 'src/state/settings/settings.selectors'

import { createWorkerPools } from 'src/workers/createWorkerPools'

import { i18nInit } from './i18n/i18n'
import { configureStore } from './state/store'

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

  const workerPools = createWorkerPools()

  const { persistor, store } = await configureStore({ router, workerPools })

  const state: State = store.getState()

  const localeKey = selectLocaleKey(state)
  const i18nState = await i18nInit({ localeKey })

  return { persistor, store, i18nState }
}
