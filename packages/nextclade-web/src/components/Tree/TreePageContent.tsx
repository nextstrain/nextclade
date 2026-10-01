import { isNil } from 'lodash'
import React, { ReactNode, useLayoutEffect, useState } from 'react'
import { useRecoilValue } from 'recoil'
import { Provider as ReactReduxProvider, useSelector } from 'react-redux'
import { I18nextProvider } from 'react-i18next'
import { Store } from 'redux'
import { auspiceFilterBadgeIconsCentered } from 'src/components/Tree/auspiceFilterBadgeStyle'
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
import { LogoGisaid } from 'src/components/Common/LogoGisaid'
import { Tree } from 'src/components/Tree/Tree'
import { Sidebar } from 'src/components/Tree/Sidebar'
import { SidebarLayout } from 'src/components/Layout/SidebarLayout'
import { PAGE_GUTTER_PX, SIDEBAR_THEME } from 'src/components/Layout/sidebarTheme'

const TreeContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  min-height: 0;
`

/** Row above the tree: active filters, data attribution and download */
const TreeHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  min-width: 0;
`

/** Text style of the filter summary in the Auspice info panel on nextstrain.org */
const AUSPICE_INFO_TEXT = {
  color: '#888',
  fontWeight: 500,
}

/** Active filters in one line. Auspice draws the set notation symbols large, which would make the line taller */
const FiltersSummaryWrapper = styled.div`
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  color: ${AUSPICE_INFO_TEXT.color};
  font-size: 14px;
  font-weight: ${AUSPICE_INFO_TEXT.fontWeight};
  line-height: 20px;
  white-space: nowrap;
  text-overflow: ellipsis;

  & span {
    font-size: 18px !important;
    line-height: 1 !important;
  }

  ${auspiceFilterBadgeIconsCentered}
`

/**
 * GISAID data attribution, styled like the filter summary next to it. The solid GISAID logo looks heavier than the
 * outlined filter badge and tree buttons of the same height, so it is drawn smaller.
 */
const TreeHeaderLogoGisaid = styled(LogoGisaid)`
  color: ${AUSPICE_INFO_TEXT.color};
  font-size: 14px;
  font-weight: ${AUSPICE_INFO_TEXT.fontWeight};

  & svg {
    width: auto;
    height: 16px;
  }
`

const HeaderSpacer = styled.div`
  flex: 1 1 0;
`

/** Content of the tree page when there is no tree to show */
const PlaceholderContent = styled.div`
  padding-left: ${PAGE_GUTTER_PX}px;
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
              <Tree
                header={
                  <TreeHeader>
                    <FiltersSummaryWrapper>
                      <FiltersSummary />
                    </FiltersSummaryWrapper>
                    <HeaderSpacer />
                    <GisaidLogoWidget />
                    <ButtonSvg />
                  </TreeHeader>
                }
              />
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

  return <TreeHeaderLogoGisaid />
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
          <PlaceholderContent>
            {children}
            <p className="m-0 mt-2">
              <Link href="/">{t('Return to the start page')}</Link>
            </p>
          </PlaceholderContent>
        </SidebarLayout>
      </ThemeProvider>
    </I18nextProvider>
  )
}
