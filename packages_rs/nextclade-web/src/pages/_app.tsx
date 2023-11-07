import 'reflect-metadata'

import 'css.escape'

import { isEmpty, isNil } from 'lodash'
import React, { useEffect, Suspense, useMemo, PropsWithChildren } from 'react'
import { RecoilEnv, RecoilRoot, useRecoilCallback, useRecoilState, useRecoilValue } from 'recoil'
import { AppProps } from 'next/app'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import { DatasetPage } from 'src/components/Main/DatasetPage'
import { sanitizeError } from 'src/helpers/sanitizeError'
import { useRunAnalysis } from 'src/hooks/useRunAnalysis'
import i18nAuspice, { changeAuspiceLocale } from 'src/i18n/i18n.auspice'
import { createInputFastasFromUrlParam, createInputFromUrlParamMaybe } from 'src/io/createInputFromUrlParamMaybe'
import LoadingPage from 'src/pages/loading'
import { mdxComponents } from 'src/mdx-components'
import { globalErrorAtom } from 'src/state/error.state'
import {
  geneMapInputAtom,
  qrySeqInputsStorageAtom,
  refSeqInputAtom,
  refTreeInputAtom,
  virusPropertiesInputAtom,
} from 'src/state/inputs.state'
import { localeAtom } from 'src/state/locale.state'
import {
  changelogIsShownAtom,
  changelogLastVersionSeenAtom,
  changelogShouldShowOnUpdatesAtom,
  isInitializedAtom,
} from 'src/state/settings.state'
import { configureStore } from 'src/state/store'
import { shouldShowChangelog } from 'src/state/utils/changelog'
import { ThemeProvider } from 'styled-components'
import { Provider as ReactReduxProvider } from 'react-redux'
import { I18nextProvider } from 'react-i18next'
import { MDXProvider } from '@mdx-js/react'
import { QueryClient, QueryClientConfig, QueryClientProvider } from 'react-query'
import { ReactQueryDevtools } from 'react-query/devtools'

import { DOMAIN_STRIPPED } from 'src/constants'
import { parseUrl } from 'src/helpers/parseUrl'
import { getDatasetServerUrl, initializeDatasets } from 'src/io/fetchDatasets'
import { fetchSingleDataset } from 'src/io/fetchSingleDataset'
import { ErrorPopup } from 'src/components/Error/ErrorPopup'
import { SEO } from 'src/components/Common/SEO'
import { Plausible } from 'src/components/Common/Plausible'
import i18n, { changeLocale, getLocaleWithKey } from 'src/i18n/i18n'
import { theme } from 'src/theme'
import {
  datasetCurrentAtom,
  datasetsAtom,
  datasetServerUrlAtom,
  minimizerIndexVersionAtom,
} from 'src/state/dataset.state'
import { ErrorBoundary } from 'src/components/Error/ErrorBoundary'

import 'src/styles/global.scss'

RecoilEnv.RECOIL_DUPLICATE_ATOM_KEY_CHECKING_ENABLED = false

/**
 * Dummy component that allows to set recoil state asynchronously. Needed because RecoilRoot's initializeState
 * currently only handles synchronous update and any calls to set() from promises have no effect
 */
export function RecoilStateInitializer() {
  const router = useRouter()

  // NOTE: Do manual parsing, because router.query is randomly empty on the first few renders and on repeated renders.
  // This is important, because various states depend on query, and when it changes back and forth,
  // the state also changes unexpectedly.
  const { query: urlQuery } = useMemo(() => parseUrl(router.asPath), [router.asPath])

  const [initialized, setInitialized] = useRecoilState(isInitializedAtom)

  const run = useRunAnalysis()

  const error = useRecoilValue(globalErrorAtom)

  const initialize = useRecoilCallback(({ set, snapshot }) => () => {
    if (initialized) {
      return
    }

    const snapShotRelease = snapshot.retain()
    const { getPromise } = snapshot

    // eslint-disable-next-line no-void
    void Promise.resolve()
      // eslint-disable-next-line promise/always-return
      .then(async () => {
        const localeKey = await getPromise(localeAtom)
        const locale = getLocaleWithKey(localeKey)
        await changeLocale(i18n, locale.key)
        await changeAuspiceLocale(i18nAuspice, locale.key)
        set(localeAtom, locale.key)
      })
      .then(async () => {
        const datasetInfo = await fetchSingleDataset(urlQuery)

        if (!isNil(datasetInfo)) {
          const { datasets, currentDataset } = datasetInfo
          return { datasets, currentDataset, minimizerIndexVersion: undefined }
        }

        const datasetServerUrl = await getDatasetServerUrl(urlQuery)
        set(datasetServerUrlAtom, datasetServerUrl)

        const { datasets, currentDataset, minimizerIndexVersion } = await initializeDatasets(datasetServerUrl, urlQuery)
        return { datasets, currentDataset, minimizerIndexVersion }
      })
      .catch((error) => {
        // Dataset error is fatal and we want error to be handled in the ErrorBoundary
        setInitialized(false)
        set(globalErrorAtom, sanitizeError(error))
        throw error
      })
      .then(async ({ datasets, currentDataset, minimizerIndexVersion }) => {
        set(datasetsAtom, { datasets })
        const previousDataset = await getPromise(datasetCurrentAtom)
        const dataset = currentDataset ?? previousDataset
        set(datasetCurrentAtom, dataset)
        set(minimizerIndexVersionAtom, minimizerIndexVersion)
        return dataset
      })
      .then((dataset) => {
        const inputFastas = createInputFastasFromUrlParam(urlQuery, dataset)

        if (!isEmpty(inputFastas)) {
          set(qrySeqInputsStorageAtom, inputFastas)
        }

        set(refSeqInputAtom, createInputFromUrlParamMaybe(urlQuery, 'input-ref'))
        set(geneMapInputAtom, createInputFromUrlParamMaybe(urlQuery, 'input-annotation'))
        set(refTreeInputAtom, createInputFromUrlParamMaybe(urlQuery, 'input-tree'))
        set(virusPropertiesInputAtom, createInputFromUrlParamMaybe(urlQuery, 'input-pathogen-json'))

        if (!isEmpty(inputFastas)) {
          run()
        }

        return undefined
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
        return undefined
      })
      .catch((error) => {
        setInitialized(true)
        set(globalErrorAtom, sanitizeError(error))
      })
      .finally(() => {
        snapShotRelease()
      })
  })

  useEffect(() => {
    initialize()
  })

  if (!initialized && !isNil(error)) {
    throw error
  }

  return null
}

// HACK: primitive router. Replace with something more sturdy
function Router({ children }: PropsWithChildren<unknown>) {
  const { asPath } = useRouter()
  const dataset = useRecoilValue(datasetCurrentAtom)
  const fallback = useMemo(() => <LoadingPage />, [])

  const { Component } = useMemo(() => {
    if (asPath !== '/dataset' && !isNil(dataset)) {
      return { Component: <DatasetPage /> }
    }
    return { Component: children }
  }, [asPath, children, dataset])

  return (
    <Suspense fallback={fallback}>
      <RecoilStateInitializer />
      {Component}
    </Suspense>
  )
}

const REACT_QUERY_OPTIONS: QueryClientConfig = {
  defaultOptions: { queries: { suspense: true, retry: 1 } },
}

export function MyApp({ Component, pageProps, router }: AppProps) {
  const queryClient = useMemo(() => new QueryClient(REACT_QUERY_OPTIONS), [])
  const { store } = useMemo(() => configureStore(), [])
  const fallback = useMemo(() => <LoadingPage />, [])

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development' && !['/', '/loading'].includes(router.pathname)) {
      void router.replace('/') // eslint-disable-line no-void
    }

    void router.prefetch('/') // eslint-disable-line no-void
    void router.prefetch('/results') // eslint-disable-line no-void
  }, [router])

  return (
    <Suspense fallback={fallback}>
      <ReactReduxProvider store={store}>
        <RecoilRoot>
          <ThemeProvider theme={theme}>
            <MDXProvider components={mdxComponents}>
              <Plausible domain={DOMAIN_STRIPPED} />
              <QueryClientProvider client={queryClient}>
                {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                {/* @ts-ignore */}
                <I18nextProvider i18n={i18n}>
                  <ErrorBoundary>
                    <Suspense>
                      <RecoilStateInitializer />
                    </Suspense>
                    <Suspense fallback={fallback}>
                      <SEO />
                      <Router>
                        <Component {...pageProps} />
                      </Router>
                      <ErrorPopup />
                      <ReactQueryDevtools initialIsOpen={false} />
                    </Suspense>
                  </ErrorBoundary>
                </I18nextProvider>
              </QueryClientProvider>
            </MDXProvider>
          </ThemeProvider>
        </RecoilRoot>
      </ReactReduxProvider>
    </Suspense>
  )
}

// NOTE: This disables server-side rendering (SSR) entirely, to avoid fatal error
// 'Hydration failed because the initial UI does not match what was rendered on the server'.
// This is probably a bug in React 18, or in Next.js, or in the app. There's been reports that improper
// nesting of HTML and SVG elements can cause the mismatch.
//
// See:
//  - https://github.com/facebook/react/issues/22833
//  - https://github.com/facebook/react/issues/24519
//  - https://github.com/vercel/next.js/discussions/35773
//  - https://nextjs.org/docs/messages/react-hydration-error
//  - https://stackoverflow.com/questions/71706064/react-18-hydration-failed-because-the-initial-ui-does-not-match-what-was-render
//
//
// NOTE: <Suspense /> does not seem to be working properly when SSR is enabled. The server hangs forever
// on the first unresolved Recoil atom, i.e. an atom without a default value. Such atoms, if accessed
// before they are initialized, trigger Suspense. However the server hangs, failing to make any progress past this
// point, even if this atom is initialized shortly after by another component. One example is the dataset atom. It is
// initially in suspended state, and unlocks after the dataset is fetched. However server stops at the dataset selector
// component and does not proceed further. We might not be handling the initialization of Recoil atoms properly,
// or it is simply not yet implemented well in Next.js or Recoil.
//
//
// TODO: When the hydration error, and the loading of Recoil atoms are sorted out we may want to remove this line,
// exporting the app component directly, reenabling SSR.
export default dynamic(() => Promise.resolve(MyApp), { ssr: false })
