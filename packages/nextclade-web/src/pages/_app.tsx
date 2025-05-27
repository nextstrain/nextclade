import 'reflect-metadata'
import 'core-js'
import 'css.escape'

import { isEmpty, isNil } from 'lodash'
import React, { useEffect, Suspense, useMemo, useRef } from 'react'
import { RecoilEnv, RecoilRoot, useRecoilCallback, useRecoilState, useRecoilValue } from 'recoil'
import { AppProps } from 'next/app'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import { sanitizeError } from 'src/helpers/sanitizeError'
import { useRunAnalysis } from 'src/hooks/useRunAnalysis'
import { useRunSeqAutodetectAsync } from 'src/hooks/useRunSeqAutodetect'
import i18nAuspice, { changeAuspiceLocale } from 'src/i18n/i18n.auspice'
import { isQueryParamTruthy } from 'src/io/getQueryParamMaybe'
import { loadInputs } from 'src/io/loadInputs'
import { mdxComponents } from 'src/mdx-components'
import LoadingPage from 'src/pages/loading'
import { globalErrorAtom } from 'src/state/error.state'
import {
  datasetJsonAtom,
  geneMapInputAtom,
  qrySeqInputsStorageAtom,
  refSeqInputAtom,
  refTreeInputAtom,
  virusPropertiesInputAtom,
} from 'src/state/inputs.state'
import { localeAtom } from 'src/state/locale.state'
import { isInitializedAtom } from 'src/state/settings.state'
import { ThemeProvider } from 'styled-components'
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
  datasetsAtom,
  datasetServerUrlAtom,
  datasetSingleCurrentAtom,
  minimizerIndexVersionAtom,
} from 'src/state/dataset.state'
import { ErrorBoundary } from 'src/components/Error/ErrorBoundary'

import 'src/styles/global.scss'

RecoilEnv.RECOIL_DUPLICATE_ATOM_KEY_CHECKING_ENABLED = false

/**
 * Dummy component that allows to set recoil state asynchronously. Needed because RecoilRoot's initializeState
 * currently only handles synchronous update and any calls to set() from promises have no effect
 */
function RecoilStateInitializer() {
  const router = useRouter()

  // NOTE: Do manual parsing, because router.query is randomly empty on the first few renders and on repeated renders.
  // This is important, because various states depend on query, and when it changes back and forth,
  // the state also changes unexpectedly.
  const { query: urlQuery } = useMemo(() => parseUrl(router.asPath), [router.asPath])

  const [initialized, setInitialized] = useRecoilState(isInitializedAtom)

  const isInitializingRef = useRef(false)

  const run = useRunAnalysis({ isSingle: true })

  const suggest = useRunSeqAutodetectAsync()

  const error = useRecoilValue(globalErrorAtom)

  // prettier-ignore
  const initialize = useRecoilCallback(({ set, snapshot }) => () => {
    if (initialized || isInitializingRef.current) {
      // Abort if already initialized or initializing
      return
    }

    // Acquire lock to only run one initialization at a time
    isInitializingRef.current = true

    const snapShotRelease = snapshot.retain()
    const { getPromise } = snapshot

    const datasetSingleCurrent = getPromise(datasetSingleCurrentAtom)

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
        const datasetServerUrl = await getDatasetServerUrl(urlQuery)
        set(datasetServerUrlAtom, datasetServerUrl)
        const { datasets, currentDataset, minimizerIndexVersion } = await initializeDatasets(datasetServerUrl, urlQuery)

        const datasetInfo = await fetchSingleDataset(urlQuery)
        if (!isNil(datasetInfo)) {
          const { datasets, currentDataset, auspiceJson } = datasetInfo
          return { datasets, currentDataset, minimizerIndexVersion: undefined, auspiceJson }
        }
        return { datasets, currentDataset, minimizerIndexVersion, auspiceJson: undefined }
      })
      .catch((error) => {
        // Dataset error is fatal and we want error to be handled in the ErrorBoundary
        setInitialized(false)
        set(globalErrorAtom, sanitizeError(error))
        throw error
      })
      .then(async ({ datasets, currentDataset, minimizerIndexVersion, auspiceJson }) => {
        set(datasetsAtom, datasets)
        let previousDataset = await datasetSingleCurrent
        if (previousDataset?.type === 'auspiceJson') {
          // Disregard previously saved dataset if it's Auspice dataset, because the data is no longer available.
          // We might re-fetch instead, but need to persist URL for that somehow.
          previousDataset = undefined
        }

        const dataset = currentDataset ?? previousDataset
        set(datasetSingleCurrentAtom, dataset)
        set(minimizerIndexVersionAtom, minimizerIndexVersion)

        if (dataset?.type === 'auspiceJson' && !isNil(auspiceJson)) {
          set(datasetJsonAtom, auspiceJson)
        } else {
          set(datasetJsonAtom, undefined)
        }
        return dataset
      })
      .then(async (dataset) => {
        const isMultiDataset = isQueryParamTruthy(urlQuery, 'multi-dataset')

        const { inputFastas, refSeq, geneMap, refTree, virusProperties } = await loadInputs(urlQuery, dataset)
        set(refSeqInputAtom, refSeq)
        set(geneMapInputAtom, geneMap)
        set(refTreeInputAtom, refTree)
        set(virusPropertiesInputAtom, virusProperties)

        if (!isEmpty(inputFastas)) {
          set(qrySeqInputsStorageAtom, inputFastas)
          if (isMultiDataset) {
            await suggest()
            run({ isSingle: false })
          } else if (!isEmpty(dataset)) {
            run({ isSingle: true })
          }
        }

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
        isInitializingRef.current = false
        snapShotRelease()
      })
    },
    [initialized, run, setInitialized, urlQuery],
  )

  useEffect(() => {
    if (!initialized) {
      initialize()
    }
  }, [initialized, initialize])

  if (!initialized && !isNil(error) && !isInitializingRef.current) {
    throw error
  }

  return null
}

const REACT_QUERY_OPTIONS: QueryClientConfig = {
  defaultOptions: { queries: { suspense: true, retry: 1 } },
}

export function MyApp({ Component, pageProps, router }: AppProps) {
  const queryClient = useMemo(() => new QueryClient(REACT_QUERY_OPTIONS), [])
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
