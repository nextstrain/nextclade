import { isNil } from 'lodash'
import React, { ReactNode, useLayoutEffect, useState } from 'react'
import { useRecoilValue } from 'recoil'
import { Provider as ReactReduxProvider, useSelector } from 'react-redux'
import { I18nextProvider } from 'react-i18next'
import { Store } from 'redux'
import { ButtonSvg } from 'src/components/Tree/ButtonSvg'
import { Link } from 'src/components/Link/Link'
import styled, { ThemeProvider } from 'styled-components'
import type { AuspiceJsonV2, AuspiceState } from 'auspice'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { auspiceStartClean, treeFilterByNodeType } from 'src/state/auspice/auspice.actions'
import { changeColorBy } from 'auspice/src/actions/colors'
import { createAuspiceState } from 'src/state/auspice/createAuspiceState'
import { useEffectiveDataset } from 'src/hooks/useEffectiveDataset'
import { hasMultipleDatasetsForAnalysisAtom, isViewedDatasetUnknownAtom } from 'src/state/dataset.state'
import { treeAtom } from 'src/state/results.state'
import { configureStore } from 'src/state/store'
import i18nAuspice from 'src/i18n/i18n.auspice'
import FiltersSummary from 'auspice/src/components/info/filtersSummary'
import { LogoGisaid as LogoGisaidBase } from 'src/components/Common/LogoGisaid'
import { Tree } from 'src/components/Tree/Tree'
import { Sidebar } from 'src/components/Tree/Sidebar'
import { SidebarLayout } from 'src/components/Layout/SidebarLayout'
import { SIDEBAR_THEME } from 'src/components/Layout/sidebarTheme'

const TreeContainer = styled.div`
  flex: 1 1;
  overflow-y: scroll;
`

const TreeTopPanel = styled.div`
  display: flex;
`

const FiltersSummaryWrapper = styled.div`
  flex: 1 1 100%;
  padding-left: 1rem;
`

const LogoGisaidWrapper = styled.div`
  display: flex;
  flex: 0 0 auto;
  margin: 0 auto;
  margin-right: 2.25rem;
  margin-top: 10px;
`

const LogoGisaid = styled(LogoGisaidBase)`
  margin-top: auto;
`

export interface TreePageContentProps {
  tree?: AuspiceJsonV2
}

export default function TreePageContent({ tree: treeProp }: TreePageContentProps) {
  const { t } = useTranslationSafe()

  const isViewedDatasetUnknown = useRecoilValue(isViewedDatasetUnknownAtom)
  const { effectiveDatasetPath, dataset } = useEffectiveDataset()

  const treeFromState = useRecoilValue(treeAtom(effectiveDatasetPath ?? ''))
  const tree = treeProp ?? treeFromState

  const [store, setStore] = useState<Store<AuspiceState> | null>(null)

  useLayoutEffect(() => {
    if (!isNil(tree)) {
      const { store: newStore } = configureStore()
      const { dispatch } = newStore
      const auspiceState = createAuspiceState(tree, dispatch)
      dispatch(auspiceStartClean(auspiceState))
      dispatch(changeColorBy())
      dispatch(treeFilterByNodeType(['New']))
      setStore(newStore)
    }
  }, [tree, effectiveDatasetPath])

  // Handle unclassified sequences view - no tree available
  if (isViewedDatasetUnknown) {
    return (
      <TreePagePlaceholder>
        <h4>{t('Unclassified sequences')}</h4>
        <p className="m-0">{t('Tree view is not available for unclassified sequences.')}</p>
        <p className="m-0">{t('Select a dataset from the sidebar to view its tree.')}</p>
      </TreePagePlaceholder>
    )
  }

  // No datasets available - show recovery UI with sidebar
  if (!dataset) {
    return (
      <TreePagePlaceholder>
        <h4>{t('No analysis results available')}</h4>
        <p className="m-0">{t('Run analysis to view the phylogenetic tree.')}</p>
      </TreePagePlaceholder>
    )
  }

  // Dataset selected but has no tree - show "no tree" message with sidebar
  if (isNil(tree) || isNil(store)) {
    return (
      <TreePagePlaceholder>
        <h4>{t('This dataset has no reference tree')}</h4>
        <p className="m-0">{t('Tree-related functionality is disabled.')}</p>
        <p className="m-0">{t('Please contact dataset authors for details.')}</p>
      </TreePagePlaceholder>
    )
  }

  return (
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    <I18nextProvider i18n={i18nAuspice}>
      <ThemeProvider theme={SIDEBAR_THEME as never}>
        <ReactReduxProvider store={store}>
          <SidebarLayout sidebar={<Sidebar hasTree />}>
            <TreeContainer>
              <TreeTopPanel>
                <FiltersSummaryWrapper>
                  <FiltersSummary />
                </FiltersSummaryWrapper>
                <GisaidLogoWidget />
                <ButtonSvg />
              </TreeTopPanel>
              <Tree />
            </TreeContainer>
          </SidebarLayout>
        </ReactReduxProvider>
      </ThemeProvider>
    </I18nextProvider>
  )
}

function GisaidLogoWidget() {
  const isDataFromGisaid = useSelector<AuspiceState>((state) =>
    state.metadata?.dataProvenance?.some((provenance) => provenance.name?.toLowerCase() === 'gisaid'),
  )

  if (!isDataFromGisaid) {
    return null
  }

  return (
    <LogoGisaidWrapper>
      <LogoGisaid />
    </LogoGisaidWrapper>
  )
}

interface TreePagePlaceholderProps {
  children: ReactNode
}

function TreePagePlaceholder({ children }: TreePagePlaceholderProps) {
  const { t } = useTranslationSafe()
  // Without a tree, the sidebar only holds the dataset switcher
  const hasMultipleDatasetsForAnalysis = useRecoilValue(hasMultipleDatasetsForAnalysisAtom)

  return (
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    <I18nextProvider i18n={i18nAuspice}>
      <ThemeProvider theme={SIDEBAR_THEME as never}>
        <SidebarLayout sidebar={hasMultipleDatasetsForAnalysis ? <Sidebar hasTree={false} /> : undefined}>
          <TreeContainer>
            <TreeTopPanel>
              <PlaceholderContent>
                {children}
                <p className="m-0 mt-2">
                  <Link href="/">{t('Return to the start page')}</Link>
                </p>
              </PlaceholderContent>
            </TreeTopPanel>
          </TreeContainer>
        </SidebarLayout>
      </ThemeProvider>
    </I18nextProvider>
  )
}

const PlaceholderContent = styled.div`
  margin: 0.5rem;
`
