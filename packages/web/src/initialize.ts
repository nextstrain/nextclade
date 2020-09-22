import Axios from 'axios'
import type { Router } from 'next/router'

import { Dispatch } from 'redux'
import { sanitizeError } from 'src/helpers/sanitizeError'
import { algorithmRunAsync, setIsDirty } from 'src/state/algorithm/algorithm.actions'
import { errorAdd } from 'src/state/error/error.actions'

import { configureStore } from 'src/state/store'
import { createWorkerPools } from 'src/workers/createWorkerPools'
import { setLocale } from 'src/state/settings/settings.actions'

export interface InitializeParams {
  router: Router
}

const allowResultsPage = process.env.NODE_ENV === 'development' && process.env.DEBUG_SET_INITIAL_DATA === 'true'

export function takeFirstMaybe<T>(maybeArray: T | T[]): T | undefined {
  if (!Array.isArray(maybeArray)) {
    return maybeArray
  }

  if (maybeArray.length > 0) {
    return maybeArray[0]
  }

  return undefined
}

export async function fetchInputsAndRunMaybe(dispatch: Dispatch, router: Router) {
  const inputFastaUrl = takeFirstMaybe(router.query?.['input-fasta'])
  if (inputFastaUrl) {
    try {
      const { data } = await Axios.get<string | undefined>(inputFastaUrl)
      if (data) {
        dispatch(setIsDirty(true))
        dispatch(algorithmRunAsync.trigger(data))
        await router.replace('/results')
      }
    } catch (error_) {
      const error = sanitizeError(error_)
      console.error(error)
      dispatch(errorAdd({ error }))
    }
  }
}

export async function initialize({ router }: InitializeParams) {
  if (!allowResultsPage && router.pathname === '/results') {
    await router.replace('/')
  }

  void router.prefetch('/') // eslint-disable-line no-void
  void router.prefetch('/results') // eslint-disable-line no-void

  const workerPools = await createWorkerPools()

  const { persistor, store } = await configureStore({ router, workerPools })

  const { localeKey } = store.getState().settings
  store.dispatch(setLocale(localeKey))

  await fetchInputsAndRunMaybe(store.dispatch, router)

  return { persistor, store }
}
