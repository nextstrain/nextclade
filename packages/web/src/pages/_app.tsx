import 'map.prototype.tojson' // to visualize Map in Redux Dev Tools
import 'set.prototype.tojson' // to visualize Set in Redux Dev Tools
import 'src/helpers/errorPrototypeTojson' // to visualize Error in Redux Dev Tools

import 'react-dates/initialize'

import { enableES5 } from 'immer'

import React, { Suspense, useEffect, useState } from 'react'

import NextApp, { AppInitialProps, AppContext, AppProps } from 'next/app'
import type { Persistor } from 'redux-persist'
import type { Store } from 'redux'
import type { i18n } from 'i18next'

import { Provider } from 'react-redux'
import { I18nextProvider } from 'react-i18next'
import { PersistGate } from 'redux-persist/integration/react'
import { MDXProvider } from '@mdx-js/react'

import LinkExternal from 'src/components/Link/LinkExternal'
import Loading from 'src/components/Loading/Loading'

import { initialize } from 'src/initialize'

import 'src/styles/global.scss'

enableES5()

export interface AppState {
  persistor: Persistor
  store: Store
  i18n: i18n
}

export default function MyApp({ Component, pageProps }: AppProps) {
  const [state, setState] = useState<AppState | undefined>()

  useEffect(() => {
    initialize()
      .then(setState)
      .catch((error: Error) => {
        throw error
      })
  }, [])

  if (!state) {
    return null
  }

  const { store, persistor, i18n } = state

  return (
    <Suspense fallback={<Loading />}>
      <Provider store={store}>
        <MDXProvider components={{ a: LinkExternal }}>
          <PersistGate loading={null} persistor={persistor}>
            <I18nextProvider i18n={i18n}>
              <Component {...pageProps} />
            </I18nextProvider>
          </PersistGate>
        </MDXProvider>
      </Provider>
    </Suspense>
  )
}

MyApp.getInitialProps = async (appContext: AppContext): Promise<AppInitialProps> => {
  return NextApp.getInitialProps(appContext)
}
