import React from 'react'
import { Col, Row } from 'reactstrap'
import { useRecoilValue } from 'recoil'
import styled from 'styled-components'
import { useUpdatedDataset } from 'src/io/fetchDatasets'
import { datasetCurrentAtom } from 'src/state/dataset.state'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { DatasetInfo } from 'src/components/Main/DatasetInfo'
import { DatasetContentSection } from 'src/components/Main/DatasetContentSection'
import { DatasetCurrentUpdateNotification } from 'src/components/Main/DatasetCurrentUpdateNotification'

export const CurrentDatasetInfoContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
`

export const CurrentDatasetInfoHeader = styled.section`
  display: flex;
  margin-bottom: 0.5rem;
`

const DatasetInfoH4 = styled.h4`
  flex: 1;
  margin: auto 0;
  margin-top: 12px;
`

export const CurrentDatasetInfoBody = styled.section`
  display: flex;
  flex-direction: column;
  padding: 12px;
  border: 1px #ccc9 solid;
  border-radius: 5px;
`

const Container = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
`

const Header = styled.div`
  flex: 0;
`

const Main = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: auto;
  width: 100%;

  margin: 0.5rem 0;
`

export const FlexLeft = styled.div`
  flex: 1;
`

export const FlexRight = styled.div``

export function DatasetCurrent() {
  // Periodically checks if there's local update for the current dataset
  useUpdatedDataset()

  const { t } = useTranslationSafe()
  const dataset = useRecoilValue(datasetCurrentAtom)

  if (!dataset) {
    return null
  }

  return (
    <CurrentDatasetInfoContainer>
      <CurrentDatasetInfoHeader>
        <DatasetInfoH4>{t('Selected pathogen')}</DatasetInfoH4>
      </CurrentDatasetInfoHeader>
      <Container>
        <Header>
          <CurrentDatasetInfoBody>
            <DatasetCurrentUpdateNotification />

            <Row noGutters className="w-100">
              <Col className="d-flex">
                <DatasetInfo dataset={dataset} />
              </Col>
            </Row>
          </CurrentDatasetInfoBody>
        </Header>

        <Main>
          <DatasetContentSection />
        </Main>
      </Container>
    </CurrentDatasetInfoContainer>
  )
}
