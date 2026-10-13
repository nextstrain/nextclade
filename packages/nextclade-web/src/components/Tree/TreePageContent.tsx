import { isNil } from 'lodash'
import React, { ReactNode, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useRecoilValue } from 'recoil'
import { Provider as ReactReduxProvider, useSelector } from 'react-redux'
import { I18nextProvider } from 'react-i18next'
import { Store } from 'redux'
import { auspiceFilterBadgeIconsCentered } from 'src/components/Tree/auspiceFilterBadgeStyle'
import { ButtonSvg } from 'src/components/Tree/ButtonSvg'
import { ButtonTreeJson } from 'src/components/Tree/ButtonTreeJson'
import { TreeTabButtonGroup } from 'src/components/Tree/TreeTabButton'
import { Link } from 'src/components/Link/Link'
import styled, { ThemeProvider } from 'styled-components'
import type { AuspiceJsonV2, AuspiceState } from 'auspice'
import { TFunc, useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { auspiceStartClean, treeFilterByNodeType } from 'src/state/auspice/auspice.actions'
import { changeColorBy } from 'auspice/src/actions/colors'
import { createAuspiceState } from 'src/state/auspice/createAuspiceState'
import { useEffectiveDataset } from 'src/hooks/useEffectiveDataset'
import { TreeStatus, useTreeStatus } from 'src/hooks/useTreeStatus'
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
import { LoadingSpinner } from 'src/components/Loading/Loading'
import { attrStrMaybe, Dataset } from 'src/types'

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

/** Content of the tree page while the tree is expected */
const PendingContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 0 ${PAGE_GUTTER_PX}px;
  text-align: center;
`

/** The spinner centers itself with auto margins, which would push the text below it to the bottom of the page */
const PendingSpinner = styled(LoadingSpinner)`
  margin: 0;
`

const PlaceholderLinkRow = styled.p`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin: 0.5rem 0 0 0;
`

export default function TreePageContent() {
  const isViewedDatasetUnknown = useRecoilValue(isViewedDatasetUnknownAtom)
  const { effectiveDatasetPath, dataset } = useEffectiveDataset()

  const tree = useRecoilValue(treeAtom(effectiveDatasetPath ?? ''))
  const treeStatus = useTreeStatus(effectiveDatasetPath)

  const [store, setStore] = useState<Store<AuspiceState> | null>(null)

  // Tree for which the current store was created. Auspice draws the tree from the nodes of the store that it mounts
  // with, so the store is created once per tree: when React StrictMode runs this effect again after mounting, a second
  // store would leave the mounted tree drawing nodes that the store no longer holds, and Auspice's zoom and focus
  // actions, which reach the drawing through the store's nodes, would not find it
  const storeTreeRef = useRef<AuspiceJsonV2 | null>(null)

  useLayoutEffect(() => {
    if (!isNil(tree) && storeTreeRef.current !== tree) {
      storeTreeRef.current = tree
      const { store: newStore } = configureStore()
      const { dispatch } = newStore
      const auspiceState = createAuspiceState(tree, dispatch)
      dispatch(auspiceStartClean(auspiceState))
      dispatch(changeColorBy())
      dispatch(treeFilterByNodeType(['New']))
      setStore(newStore)
    }
  }, [tree, effectiveDatasetPath])

  if (isViewedDatasetUnknown) {
    return <TreePageUnclassified />
  }

  if (isNil(tree) || isNil(store)) {
    return <TreePageWithoutTree treeStatus={treeStatus} datasetPath={effectiveDatasetPath} dataset={dataset} />
  }

  return (
    <ReactReduxProvider store={store}>
      <TreePageFrame sidebar={<Sidebar controls="tree" />}>
        <TreeContainer>
          <Tree
            header={
              <TreeHeader>
                <FiltersSummaryWrapper>
                  <FiltersSummary />
                </FiltersSummaryWrapper>
                <HeaderSpacer />
                <GisaidLogoWidget />
                <TreeTabButtonGroup>
                  <ButtonSvg />
                  <ButtonTreeJson datasetName={effectiveDatasetPath ?? ''} />
                </TreeTabButtonGroup>
              </TreeHeader>
            }
          />
        </TreeContainer>
      </TreePageFrame>
    </ReactReduxProvider>
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

function TreePageUnclassified() {
  const { t } = useTranslationSafe()
  return (
    <TreePagePlaceholder>
      <h4>{t('Unclassified sequences')}</h4>
      <p className="m-0">{t('Tree view is not available for unclassified sequences.')}</p>
      <p className="m-0">{t('Select a dataset from the sidebar to view its tree.')}</p>
      <PlaceholderLinks showResults />
    </TreePagePlaceholder>
  )
}

interface TreePageWithoutTreeProps {
  treeStatus: TreeStatus
  datasetPath: string | undefined
  dataset: Dataset | undefined
}

function TreePageWithoutTree({ treeStatus, datasetPath, dataset }: TreePageWithoutTreeProps) {
  const { t } = useTranslationSafe()

  switch (treeStatus) {
    case 'notRun':
      return (
        <TreePagePlaceholder>
          <h4>{t('No analysis results available')}</h4>
          <p className="m-0">{t('Run analysis to view the phylogenetic tree.')}</p>
          <PlaceholderLinks />
        </TreePagePlaceholder>
      )
    case 'pending':
    case 'analyzing':
    case 'building':
      return <TreePagePending treeStatus={treeStatus} />
    // The Auspice store is created in a layout effect right after the tree arrives, so this is not painted
    case 'ready':
      return <TreePagePending treeStatus="building" />
    case 'absent':
      return <TreePageNoReferenceTree datasetPath={datasetPath} dataset={dataset} />
    case 'failed':
      return (
        <TreePagePlaceholder>
          <h4>{t('Tree is not available')}</h4>
          <p className="m-0">{t('The analysis failed before the tree was built.')}</p>
          <PlaceholderLinks showResults />
        </TreePagePlaceholder>
      )
  }
}

/** Tree statuses in which the tree is expected to appear */
type TreeStatusPending = Extract<TreeStatus, 'pending' | 'analyzing' | 'building'>

/** Tree page layout with a placeholder sidebar, while the tree is expected to appear */
function TreePagePending({ treeStatus }: { treeStatus: TreeStatusPending }) {
  const { t } = useTranslationSafe()
  const { title, text } = useMemo(() => getPendingTexts(treeStatus, t), [treeStatus, t])

  return (
    <TreePageFrame sidebar={<Sidebar controls="placeholder" />}>
      <PendingContent role="status">
        <PendingSpinner size={80} />
        <h4 className="mt-4">{title}</h4>
        <p className="m-0">{text}</p>
        {treeStatus === 'analyzing' && (
          <p className="m-0 mt-2">
            <Link href="/results">{t('Meanwhile, view the results table')}</Link>
          </p>
        )}
      </PendingContent>
    </TreePageFrame>
  )
}

function getPendingTexts(treeStatus: TreeStatusPending, t: TFunc): { title: string; text: string } {
  const texts: Record<TreeStatusPending, { title: string; text: string }> = {
    pending: {
      title: t('Preparing analysis'),
      text: t('Loading the dataset and starting the analysis.'),
    },
    analyzing: {
      title: t('Analyzing sequences'),
      text: t('The tree will appear here when all sequences are analyzed and placed on the reference tree.'),
    },
    building: {
      title: t('Building tree'),
      text: t('Placing sequences on the reference tree. The tree will appear here shortly.'),
    },
  }
  return texts[treeStatus]
}

interface TreePageNoReferenceTreeProps {
  datasetPath: string | undefined
  dataset: Dataset | undefined
}

function TreePageNoReferenceTree({ datasetPath, dataset }: TreePageNoReferenceTreeProps) {
  const { t } = useTranslationSafe()
  // Custom input files apply only to single-dataset analysis
  const hasMultipleDatasetsForAnalysis = useRecoilValue(hasMultipleDatasetsForAnalysisAtom)
  const datasetName = attrStrMaybe(dataset?.attributes, 'name') ?? datasetPath ?? t('Unknown')

  return (
    <TreePagePlaceholder>
      <h4>{t('This dataset has no reference tree')}</h4>
      <p className="m-0">{t('Dataset "{{name}}" does not include a reference tree.', { name: datasetName })}</p>
      <p className="m-0">
        {t(
          'Clade assignment, private mutations and placement on the tree need a reference tree. Other results, such as alignment, mutations and translation, are in the results table.',
        )}
      </p>
      {!hasMultipleDatasetsForAnalysis && (
        <p className="m-0">
          {t(
            'To use your own reference tree, add it in the "Customize" tab on the dataset page, then run the analysis again.',
          )}{' '}
          <Link href="/dataset">{t('Open the dataset page')}</Link>
        </p>
      )}
      <PlaceholderLinks showResults />
    </TreePagePlaceholder>
  )
}

function PlaceholderLinks({ showResults = false }: { showResults?: boolean }) {
  const { t } = useTranslationSafe()
  return (
    <PlaceholderLinkRow>
      {showResults && <Link href="/results">{t('Back to results')}</Link>}
      <Link href="/">{t('Return to the start page')}</Link>
    </PlaceholderLinkRow>
  )
}

/** Tree page without the tree. The sidebar only holds the dataset switcher, when there is more than one dataset */
function TreePagePlaceholder({ children }: { children: ReactNode }) {
  const hasMultipleDatasetsForAnalysis = useRecoilValue(hasMultipleDatasetsForAnalysisAtom)
  return (
    <TreePageFrame sidebar={hasMultipleDatasetsForAnalysis ? <Sidebar controls="none" /> : undefined}>
      <PlaceholderContent>{children}</PlaceholderContent>
    </TreePageFrame>
  )
}

interface TreePageFrameProps {
  sidebar: ReactNode | undefined
  children: ReactNode
}

/** Translations and theme of the Auspice sidebar, and the sidebar layout */
function TreePageFrame({ sidebar, children }: TreePageFrameProps) {
  return (
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    <I18nextProvider i18n={i18nAuspice}>
      <ThemeProvider theme={SIDEBAR_THEME as never}>
        <SidebarLayout sidebar={sidebar}>{children}</SidebarLayout>
      </ThemeProvider>
    </I18nextProvider>
  )
}
