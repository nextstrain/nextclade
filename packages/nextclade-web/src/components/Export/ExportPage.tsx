import { useRouter } from 'next/router'
import React, { useState } from 'react'
import { useRecoilValue } from 'recoil'
import { ViewedDatasetSelector } from 'src/components/Main/ViewedDatasetSelector'
import styled from 'styled-components'
import { hasMultipleDatasetsForAnalysisAtom } from 'src/state/dataset.state'
import { TabContent, TabLabel, TabNav, TabPane } from 'src/components/Common/TabsFull'
import { ExportTabColumnConfig } from 'src/components/Export/ExportTabColumnConfig'
import { ExportTabMain } from 'src/components/Export/ExportTabMain'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { Layout } from 'src/components/Layout/Layout'

export function ExportPage() {
  const { t } = useTranslationSafe()
  const { asPath } = useRouter()
  const [activeTabId, setActiveTabId] = useState(asPath.split('#')[1] ?? 'files')
  const hasMultipleDatasetsForAnalysis = useRecoilValue(hasMultipleDatasetsForAnalysisAtom)

  return (
    <Layout>
      <Container>
        {hasMultipleDatasetsForAnalysis && (
          <div>
            <label> {t('Select dataset')}</label>
            <ViewedDatasetSelector />
          </div>
        )}

        <Header>
          <h4 className="mx-auto">{t('Download output files')}</h4>
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
      </Container>
    </Layout>
  )
}

const Container = styled.div`
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
