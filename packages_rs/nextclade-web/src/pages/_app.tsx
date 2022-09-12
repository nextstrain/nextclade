import 'reflect-metadata'

import 'css.escape'

import { isNil, memoize } from 'lodash'
import React, { useEffect, Suspense, useMemo } from 'react'
import { RecoilRoot, useRecoilCallback, useRecoilState, useRecoilValue } from 'recoil'
import { AppProps } from 'next/app'
import { useRouter } from 'next/router'
import { BrowserWarning } from 'src/components/Common/BrowserWarning'
import { sanitizeError } from 'src/helpers/sanitizeError'
import { useRunAnalysis } from 'src/hooks/useRunAnalysis'
import { createInputFromUrlParamMaybe } from 'src/io/createInputFromUrlParamMaybe'
import { globalErrorAtom } from 'src/state/error.state'
import {
  geneMapInputAtom,
  primersCsvInputAtom,
  qcConfigInputAtom,
  qrySeqInputsStorageAtom,
  refSeqInputAtom,
  refTreeInputAtom,
  virusPropertiesInputAtom,
} from 'src/state/inputs.state'
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
import { QueryClient, QueryClientProvider } from 'react-query'
import { ReactQueryDevtools } from 'react-query/devtools'

import { DOMAIN_STRIPPED } from 'src/constants'
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
import { ErrorBoundary } from 'src/components/Error/ErrorBoundary'
import { PreviewWarning } from 'src/components/Common/PreviewWarning'

import 'src/styles/global.scss'

if (process.env.NODE_ENV === 'development') {
  // Ignore recoil warning messages in browser console
  // https://github.com/facebookexperimental/Recoil/issues/733
  const shouldFilter = (args: (string | undefined)[]) =>
    args[0] && typeof args[0].includes === 'function' && args[0].includes('Duplicate atom key')

  const mutedConsole = memoize((console: Console) => ({
    ...console,
    warn: (...args: (string | undefined)[]) => (shouldFilter(args) ? null : console.warn(...args)),
    error: (...args: (string | undefined)[]) => (shouldFilter(args) ? null : console.error(...args)),
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
    void initializeDatasets(urlQuery)
      .catch((error) => {
        // Dataset error is fatal and we want error to be handled in the ErrorBoundary
        setInitialized(false)
        set(globalErrorAtom, sanitizeError(error))
        throw error
      })
      .then(({ datasets, defaultDatasetName, defaultDatasetNameFriendly, currentDatasetName }) => {
        set(datasetsAtom, {
          datasets,
          defaultDatasetName,
          defaultDatasetNameFriendly,
        })
        set(datasetCurrentNameAtom, (previous) => currentDatasetName ?? previous)

        return undefined
      })
      .then(() => {
        const qrySeqInput = createInputFromUrlParamMaybe(urlQuery, 'input-fasta')
        if (qrySeqInput) {
          set(qrySeqInputsStorageAtom, [qrySeqInput])
        }

        set(refSeqInputAtom, createInputFromUrlParamMaybe(urlQuery, 'input-root-seq'))
        set(geneMapInputAtom, createInputFromUrlParamMaybe(urlQuery, 'input-gene-map'))
        set(refTreeInputAtom, createInputFromUrlParamMaybe(urlQuery, 'input-tree'))
        set(qcConfigInputAtom, createInputFromUrlParamMaybe(urlQuery, 'input-qc-config'))
        set(virusPropertiesInputAtom, createInputFromUrlParamMaybe(urlQuery, 'input-pcr-primers'))
        set(primersCsvInputAtom, createInputFromUrlParamMaybe(urlQuery, 'input-virus-properties'))

        if (qrySeqInput) {
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

const mdxComponents = { a: LinkExternal }

export default function MyApp({ Component, pageProps, router }: AppProps) {
  const queryClient = useMemo(() => new QueryClient(), [])
  const { store } = useMemo(() => configureStore(), [])
  const fallback = useMemo(() => <Loading />, [])

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development' && router.pathname !== '/') {
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
                <I18nextProvider i18n={i18n}>
                  <ErrorBoundary>
                    <Suspense>
                      <RecoilStateInitializer />
                    </Suspense>
                    <Suspense fallback={fallback}>
                      <SEO />
                      <PreviewWarning />
                      <BrowserWarning />
                      <Component {...pageProps} />
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
