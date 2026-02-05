import { useRouter } from 'next/router'
import React, { useMemo, useState } from 'react'
import { useRecoilValue } from 'recoil'
import { Row, Col } from 'reactstrap'
import { ExportPageNoDataset } from 'src/components/Export/ExportPageNoDataset'
import { ExportPageUnknownDataset } from 'src/components/Export/ExportPageUnknownDataset'
import { DatasetCountBadge } from 'src/components/Main/DatasetCountBadge'
import { formatDatasetInfo } from 'src/components/Main/datasetInfoHelpers'
import { useEffectiveDataset } from 'src/hooks/useEffectiveDataset'
import styled from 'styled-components'
import { ViewedDatasetExportHelp } from 'src/components/Help/ViewedDatasetExportHelp'
import { ViewedDatasetSelector } from 'src/components/Main/ViewedDatasetSelector'
import {
  hasMultipleDatasetsForAnalysisAtom,
  isViewedDatasetUnknownAtom,
  viewedDatasetNameAtom,
} from 'src/state/dataset.state'
import { TabContent, TabLabel, TabNav, TabPane } from 'src/components/Common/TabsFull'
import { ExportTabColumnConfig } from 'src/components/Export/ExportTabColumnConfig'
import { ExportTabMain } from 'src/components/Export/ExportTabMain'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { Layout } from 'src/components/Layout/Layout'
import { ExcelDownloadLink } from 'src/components/Export/ExcelDownloadButton'
import { ExcelExportHelp } from 'src/components/Help/ExcelExportHelp'

export function ExportPage() {
  const { t } = useTranslationSafe()
  const hasMultipleDatasetsForAnalysis = useRecoilValue(hasMultipleDatasetsForAnalysisAtom)
  const viewedDatasetName = useRecoilValue(viewedDatasetNameAtom)

  return (
    <Layout>
      <Container>
        {hasMultipleDatasetsForAnalysis && (
          <Sidebar>
            <div className="mt-2 pb-1">
              <span className="mr-1">{t('All datasets')}</span>
              <span className="mr-1">
                <ExcelExportHelp />
              </span>
            </div>

            <div className="pb-1">
              <ExcelDownloadLink />
            </div>

            <div className="mt-2 pb-1 pt-2 border-top" />

            <div className="d-flex my-auto pb-1">
              <span className="mr-1">{t('Individual datasets')}</span>
              <span className="mr-1">
                <DatasetCountBadge />
              </span>
              <span className="mr-1">
                <ViewedDatasetExportHelp />
              </span>
            </div>

            <div className="pb-1">
              <ViewedDatasetSelector />
            </div>
          </Sidebar>
        )}

        <Row noGutters className="d-flex w-100 h-100 overflow-hidden">
          <Col className="mx-auto h-100 overflow-hidden">
            <MainContent key={viewedDatasetName} />
          </Col>
        </Row>
      </Container>
    </Layout>
  )
}

function MainContent() {
  const { t } = useTranslationSafe()
  const isViewedDatasetUnknown = useRecoilValue(isViewedDatasetUnknownAtom)
  const { dataset } = useEffectiveDataset()

  const { asPath } = useRouter()
  const [activeTabId, setActiveTabId] = useState(asPath.split('#')[1] ?? 'files')

  const datasetName = useMemo(() => (dataset ? formatDatasetInfo(dataset, t).datasetName : undefined), [dataset, t])

  // Handle unclassified sequences view
  if (isViewedDatasetUnknown) {
    return (
      <MainContentInner>
        <Header>
          <h4 className="mx-auto">{t('Download output files for unclassified sequences')}</h4>
        </Header>

        <Main>
          <ExportPageUnknownDataset />
        </Main>
      </MainContentInner>
    )
  }

  // No datasets available - show recovery UI
  if (!dataset) {
    return (
      <MainContentInner>
        <Header>
          <h4 className="mx-auto">{t('Export')}</h4>
        </Header>

        <Main>
          <ExportPageNoDataset />
        </Main>
      </MainContentInner>
    )
  }

  return (
    <MainContentInner>
      <Header>
        <h4 className="mx-auto">{t('Download output files for "{{ dataset }}"', { dataset: datasetName })}</h4>
      </Header>

      <Main>
        <TabNav>
          <TabLabel tabId="files" activeTabId={activeTabId} setActiveTabId={setActiveTabId}>
            {t('Files')}
          </TabLabel>
          <TabLabel tabId="column-config" activeTabId={activeTabId} setActiveTabId={setActiveTabId}>
            {t('Column config')}
          </TabLabel>
        </TabNav>
        <TabContent activeTab={activeTabId}>
          <TabPane tabId="files">
            <ExportTabMain setActiveTabId={setActiveTabId} />
          </TabPane>
          <TabPane tabId="column-config">
            <ExportTabColumnConfig setActiveTabId={setActiveTabId} />
          </TabPane>
        </TabContent>
      </Main>
    </MainContentInner>
  )
}

const Container = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
`

const Sidebar = styled.aside`
  flex: 0 0 260px;
  height: 100%;
  background-color: #f2f2f2;
  padding: 20px;
`

const MainContentInner = styled.div`
  max-width: ${(props) => props.theme.containerMaxWidths.md};
  margin: auto;
  padding: 0.8rem 0;
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
`

const Header = styled.div`
  display: flex;
  flex: 0;
  padding-left: 10px;
  margin-top: 10px;
  margin-bottom: 3px;
`

const Main = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: auto;
`
