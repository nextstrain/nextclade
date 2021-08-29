import 'reflect-metadata'

import 'css.escape'

import 'map.prototype.tojson' // to visualize Map in Redux Dev Tools
import 'set.prototype.tojson' // to visualize Set in Redux Dev Tools
import 'src/helpers/errorPrototypeTojson' // to visualize Error in Redux Dev Tools
import 'src/helpers/functionPrototypeTojson' // to visualize Function in Redux Dev Tools

import { enableES5 } from 'immer'

import React, { useEffect, useState, Suspense, useMemo } from 'react'

import { AppProps } from 'next/app'
import type { Store } from 'redux'
import { ConnectedRouter } from 'connected-next-router'
import type { Persistor } from 'redux-persist'
import { ErrorPopup } from 'src/components/Error/ErrorPopup'
import { initializeDatasets } from 'src/io/fetchDatasets'
import { fetchInputsAndRunMaybe } from 'src/io/fetchInputsAndRunMaybe'
import { ThemeProvider } from 'styled-components'

import { Provider } from 'react-redux'
import { I18nextProvider } from 'react-i18next'
import { PersistGate } from 'redux-persist/integration/react'
import { MDXProvider } from '@mdx-js/react'
import { QueryClient, QueryClientProvider } from 'react-query'
import { ReactQueryDevtools } from 'react-query/devtools'

import { initialize } from 'src/initialize'
import i18n from 'src/i18n/i18n'

import Loading from 'src/components/Loading/Loading'
import { LinkExternal } from 'src/components/Link/LinkExternal'
import { SEO } from 'src/components/Common/SEO'

import { theme } from 'src/theme'

import 'src/styles/global.scss'

enableES5()

export interface AppState {
  persistor: Persistor
  store: Store
}

export default function MyApp({ Component, pageProps, router }: AppProps) {
  const queryClient = useMemo(() => new QueryClient(), [])
  const [state, setState] = useState<AppState | undefined>()
  const store = state?.store
  const dispatch = store?.dispatch

  useEffect(() => {
    initialize({ router })
      .then(setState)
      .catch((error: Error) => {
        throw error
      })
  }, [router])

  useEffect(() => {
    if (router.query && dispatch) {
      Promise.resolve()
        .then(() => initializeDatasets(dispatch, router))
        .then(() => fetchInputsAndRunMaybe(dispatch, router))
        .catch((error: Error) => {
          throw error
        })
    }
  }, [router, router.query, state, dispatch, store])

  if (!state) {
    return <Loading />
  }

  const { store: storeNonNil, persistor } = state

  return (
    <Suspense fallback={<Loading />}>
      <Provider store={storeNonNil}>
        <ConnectedRouter>
          <ThemeProvider theme={theme}>
            <MDXProvider components={{ a: LinkExternal }}>
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
      </Provider>
    </Suspense>
  )
}
