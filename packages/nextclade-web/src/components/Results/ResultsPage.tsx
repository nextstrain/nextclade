import React, { Suspense } from 'react'
import { useRecoilValue } from 'recoil'
import { ViewedDatasetResultsHelp } from 'src/components/Help/ViewedDatasetResultsHelp'
import { ViewedDatasetSelector } from 'src/components/Main/ViewedDatasetSelector'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { hasMultipleDatasetsForAnalysisAtom, viewedDatasetNameAtom } from 'src/state/dataset.state'
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
  const { t } = useTranslationSafe()

  const datasetName = useRecoilValue(viewedDatasetNameAtom)
  const totalWidth = useRecoilValue(resultsTableTotalWidthAtom({ datasetName }))
  const hasMultipleDatasetsForAnalysis = useRecoilValue(hasMultipleDatasetsForAnalysisAtom)

  return (
    <Layout>
      <Container>
        <WrapperOuter>
          <WrapperInner $minWidth={totalWidth}>
            {hasMultipleDatasetsForAnalysis && (
              <ViewedDatasetSelectorContainer>
                <span className="ml-2 d-flex my-auto">
                  <span className="mr-1">{t('Dataset')}</span>
                  <span className="mr-1">
                    <ViewedDatasetResultsHelp />
                  </span>
                </span>
                <ViewedDatasetSelectorWrapper>
                  <ViewedDatasetSelector />
                </ViewedDatasetSelectorWrapper>
              </ViewedDatasetSelectorContainer>
            )}

            <ResultsFilter />

            <MainContent>
              <ResultsTable />
            </MainContent>

            <Footer>
              <Suspense fallback={null}>
                <GeneMapTable />
              </Suspense>
            </Footer>
          </WrapperInner>
        </WrapperOuter>
      </Container>
    </Layout>
  )
}

const ViewedDatasetSelectorContainer = styled.div`
  display: flex;
`

const ViewedDatasetSelectorWrapper = styled.div`
  flex: 0 0 400px;
`
