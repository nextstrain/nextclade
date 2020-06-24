import type { Router } from 'next/router'

import type { State } from 'src/state/reducer'
import { algorithmRunTrigger } from 'src/state/algorithm/algorithm.actions'
import { selectLocaleKey } from 'src/state/settings/settings.selectors'

import { createWorkerPools } from 'src/workers/createWorkerPools'

// import { subscribeToWorkerPools } from 'src/state/algorithm/subscribeToWorkerPools'

import { i18nInit } from './i18n/i18n'
import { configureStore } from './state/store'

export interface InitializeParams {
  router: Router
}

export async function initialize({ router }: InitializeParams) {
  const workerPools = createWorkerPools()

  const { persistor, store } = await configureStore({ router, workerPools })

  const state: State = store.getState()
  const { dispatch } = store

  // subscribeToWorkerPools(dispatch, workerPools)

  const localeKey = selectLocaleKey(state)
  const i18n = await i18nInit({ localeKey })

  dispatch(algorithmRunTrigger())

  return { persistor, store, i18n }
}
