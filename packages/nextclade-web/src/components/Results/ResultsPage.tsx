import React, { Suspense, useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { Link } from 'src/components/Link/Link'
import { ViewedDatasetResultsHelp } from 'src/components/Help/ViewedDatasetResultsHelp'
import { DatasetCountBadge } from 'src/components/Main/DatasetCountBadge'
import { ViewedDatasetSelector } from 'src/components/Main/ViewedDatasetSelector'
import { ResultsTableUnknownDataset } from 'src/components/Results/ResultsTableUnknownDataset'
import { useEffectiveDataset } from 'src/hooks/useEffectiveDataset'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import {
  hasMultipleDatasetsForAnalysisAtom,
  isViewedDatasetUnknownAtom,
} from 'src/state/dataset.state'
import styled from 'styled-components'
import { resultsTableTotalWidthAtom } from 'src/state/settings.state'
import { Layout } from 'src/components/Layout/Layout'
import { GeneMapTable } from 'src/components/GeneMap/GeneMapTable'
import { ResultsFilter } from 'src/components/Results/ResultsFilter'
import { ResultsTable } from 'src/components/Results/ResultsTable'

export const Container = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
`

const WrapperOuter = styled.div`
  flex: 1;
  width: 100%;
  height: 100%;
  overflow: auto;
  display: flex;
`

const WrapperInner = styled.div<{ $minWidth: number }>`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-width: ${(props) => props.$minWidth}px;
`

const MainContent = styled.main`
  flex: 1;
  flex-basis: 100%;
  border: none;
`

const Footer = styled.footer`
  flex-shrink: 0;
`

export function ResultsPage() {
  const isViewedDatasetUnknown = useRecoilValue(isViewedDatasetUnknownAtom)
  const { effectiveDatasetPath, dataset } = useEffectiveDataset()

  const totalWidth = useRecoilValue(resultsTableTotalWidthAtom({ datasetName: effectiveDatasetPath ?? '' }))

  const content = useMemo(() => {
    // Handle unclassified sequences view
    if (isViewedDatasetUnknown) {
      return <ResultsPageDatasetUnknown />
    }

    // No datasets available - show recovery UI
    if (!dataset) {
      return <ResultsPageNoDataset />
    }

    return <ResultsPageWithDataset />
  }, [dataset, isViewedDatasetUnknown])

  return (
    <Layout>
      <Container>
        <WrapperOuter>
          <WrapperInner $minWidth={totalWidth}>
            <ViewedDatasetSelectorResultsPage />
            {content}
          </WrapperInner>
        </WrapperOuter>
      </Container>
    </Layout>
  )
}

function ResultsPageNoDataset() {
  const { t } = useTranslationSafe()

  return (
    <MainContent>
      <NoDatasetContainer>
        <h4>{t('No analysis results available')}</h4>
        <p>{t('Run analysis to view results.')}</p>
        <p>
          <Link href="/">{t('Return to the start page')}</Link>
        </p>
      </NoDatasetContainer>
    </MainContent>
  )
}

function ResultsPageDatasetUnknown() {
  return (
    <MainContent>
      <ResultsTableUnknownDataset />
    </MainContent>
  )
}

function ResultsPageWithDataset() {
  return (
    <>
      <ResultsFilter />

      <MainContent>
        <ResultsTable />
      </MainContent>

      <Footer>
        <Suspense fallback={null}>
          <GeneMapTable />
        </Suspense>
      </Footer>
    </>
  )
}

function ViewedDatasetSelectorResultsPage() {
  const { t } = useTranslationSafe()
  const hasMultipleDatasetsForAnalysis = useRecoilValue(hasMultipleDatasetsForAnalysisAtom)

  if (!hasMultipleDatasetsForAnalysis) {
    return null
  }

  return (
    <ViewedDatasetSelectorContainer>
      <span className="ml-2 d-flex my-auto">
        <span className="mr-1">{t('Dataset')}</span>
        <span className="mr-1">
          <DatasetCountBadge />
        </span>
        <span className="mr-1">
          <ViewedDatasetResultsHelp />
        </span>
      </span>
      <ViewedDatasetSelectorWrapper>
        <ViewedDatasetSelector />
      </ViewedDatasetSelectorWrapper>
    </ViewedDatasetSelectorContainer>
  )
}

const ViewedDatasetSelectorContainer = styled.div`
  display: flex;
`

const ViewedDatasetSelectorWrapper = styled.div`
  flex: 0 0 400px;
`

const NoDatasetContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
`
