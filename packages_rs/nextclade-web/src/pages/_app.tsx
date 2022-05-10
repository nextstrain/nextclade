import 'reflect-metadata'

import 'css.escape'

import 'map.prototype.tojson' // to visualize Map in Redux Dev Tools
import 'set.prototype.tojson' // to visualize Set in Redux Dev Tools
import 'src/helpers/errorPrototypeTojson' // to visualize Error in Redux Dev Tools
import 'src/helpers/functionPrototypeTojson' // to visualize Function in Redux Dev Tools

import { enableES5 } from 'immer'
import { memoize } from 'lodash'
import React, { useEffect, useState, Suspense, useMemo } from 'react'
import { RecoilRoot, useRecoilCallback, useRecoilState } from 'recoil'
import { AppProps } from 'next/app'
import { useRouter } from 'next/router'
import type { Store } from 'redux'
import { ConnectedRouter } from 'connected-next-router'
import type { Persistor } from 'redux-persist'
import { sanitizeError } from 'src/helpers/sanitizeError'
import {
  changelogIsShownAtom,
  changelogLastVersionSeenAtom,
  changelogShouldShowOnUpdatesAtom,
  isInitializedAtom,
} from 'src/state/settings.state'
import { shouldShowChangelog } from 'src/state/utils/changelog'
import { ThemeProvider } from 'styled-components'
import { Provider } from 'react-redux'
import { I18nextProvider } from 'react-i18next'
import { PersistGate } from 'redux-persist/integration/react'
import { MDXProvider } from '@mdx-js/react'
import { QueryClient, QueryClientProvider } from 'react-query'
import { ReactQueryDevtools } from 'react-query/devtools'

import { DOMAIN_STRIPPED } from 'src/constants'
import type { State } from 'src/state/reducer'
import { initialize } from 'src/initialize'
import { parseUrl } from 'src/helpers/parseUrl'
import { initializeDatasets } from 'src/io/fetchDatasets'
import { ErrorPopup } from 'src/components/Error/ErrorPopup'
import Loading from 'src/components/Loading/Loading'
import { LinkExternal } from 'src/components/Link/LinkExternal'
import { SEO } from 'src/components/Common/SEO'
import { Plausible } from 'src/components/Common/Plausible'
import i18n from 'src/i18n/i18n'
import { theme } from 'src/theme'
import { datasetCurrentNameAtom, datasetsAtom } from 'src/state/dataset.state'
import { globalErrorAtom } from 'src/state/error.state'

import 'src/styles/global.scss'

enableES5()

if (process.env.NODE_ENV === 'development') {
  // Ignore recoil warning messages in browser console
  // https://github.com/facebookexperimental/Recoil/issues/733
  const mutedConsole = memoize((console: Console) => ({
    ...console,
    warn: (...args: string[]) => (args[0].includes('Duplicate atom key') ? null : console.warn(...args)),
  }))
  global.console = mutedConsole(global.console)
}

/**
 * Dummy component that allows to set recoil state asynchronously. Needed because RecoilRoot's initializeState
 * currently only handles synchronous update and any calls to set() from promises have no effect
 */
export function RecoilStateInitializer() {
  const router = useRouter()

  // NOTE: Do manual parsing, because router.query is randomly empty on the first few renders and on repeated renders.
  // This is important, because various states depend on query, and when it changes back and forth,
  // the state also changes unexpectedly.
  const { query } = useMemo(() => parseUrl(router.asPath), [router.asPath])

  const [initialized, setInitialized] = useRecoilState(isInitializedAtom)

  const initialize = useRecoilCallback(({ set, snapshot: { getPromise } }) => () => {
    if (initialized) {
      return
    }

    initializeDatasets(query)
      .then(({ datasets, defaultDatasetName, defaultDatasetNameFriendly, currentDatasetName }) => {
        set(datasetsAtom, {
          datasets,
          defaultDatasetName,
          defaultDatasetNameFriendly,
        })
        set(datasetCurrentNameAtom, (previous) => previous ?? currentDatasetName)

        return undefined
      })
      .then(() => {
        // TODO
        // fetchInputsAndRunMaybe(dispatch, query)
      })
      .then(async () => {
        const changelogShouldShowOnUpdates = await getPromise(changelogShouldShowOnUpdatesAtom)
        const changelogLastVersionSeen = await getPromise(changelogLastVersionSeenAtom)
        set(changelogIsShownAtom, shouldShowChangelog(changelogLastVersionSeen, changelogShouldShowOnUpdates))
        set(changelogLastVersionSeenAtom, (prev) => process.env.PACKAGE_VERSION ?? prev ?? '')
        return undefined
      })
      .then(() => {
        setInitialized(true)
      })
      .catch((error) => {
        console.error(error)
        set(globalErrorAtom, sanitizeError(error))
      })
  })

  useEffect(() => {
    initialize()
  })

  return null
}

export interface AppState {
  persistor: Persistor
  store: Store<State>
}

export default function MyApp({ Component, pageProps, router }: AppProps) {
  const queryClient = useMemo(() => new QueryClient(), [])
  const [state, setState] = useState<AppState | undefined>()
  const [initDone, setInitDone] = useState(false)
  // const [fetchDone, setFetchDone] = useState(false)
  // const store = state?.store
  // const dispatch = store?.dispatch

  // NOTE: Do manual parsing, because router.query is randomly empty on the first few renders and on repeated renders.
  // This is important, because various states depend on query, and when it changes back and forth,
  // the state also changes unexpectedly.
  const { query } = useMemo(() => parseUrl(router.asPath), [router.asPath])

  useEffect(() => {
    if (!initDone) {
      initialize({ router })
        .then(setState)
        .then(() => setInitDone(true))
        .catch((error: Error) => {
          throw error
        })
    }
  }, [initDone, router])

  // useEffect(() => {
  //   if (!fetchDone && query && dispatch && store) {
  //     Promise.resolve()
  //       .then(() => initializeDatasets(dispatch, query, store))
  //       .then(async (success) => success && fetchInputsAndRunMaybe(dispatch, query))
  //       .then((success) => setFetchDone(success))
  //       .catch((error: Error) => {
  //         throw error
  //       })
  //   }
  // }, [fetchDone, query, state, dispatch, store])

  if (!state) {
    return <Loading />
  }

  const { store: storeNonNil, persistor } = state

  return (
    <Suspense fallback={<Loading />}>
      <Provider store={storeNonNil}>
        <RecoilRoot>
          <RecoilStateInitializer />
          <ConnectedRouter>
            <ThemeProvider theme={theme}>
              <MDXProvider components={{ a: LinkExternal }}>
                <Plausible domain={DOMAIN_STRIPPED} />
                <QueryClientProvider client={queryClient}>
                  <PersistGate loading={null} persistor={persistor}>
                    <I18nextProvider i18n={i18n}>
                      <SEO />
                      <Component {...pageProps} />
                      <ErrorPopup />
                      <ReactQueryDevtools initialIsOpen={false} />
                    </I18nextProvider>
                  </PersistGate>
                </QueryClientProvider>
              </MDXProvider>
            </ThemeProvider>
          </ConnectedRouter>
        </RecoilRoot>
      </Provider>
    </Suspense>
  )
}
