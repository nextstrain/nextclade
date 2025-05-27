import React from 'react'
import { Container as ContainerBase } from 'reactstrap'
import { useRecoilValue } from 'recoil'
import styled from 'styled-components'
import { DatasetInfoCompact } from 'src/components/Main/DatasetInfoCompact'
import { ButtonRun } from 'src/components/Main/ButtonRun'
import { datasetSingleCurrentAtom } from 'src/state/dataset.state'
import { useUpdatedDataset } from 'src/io/fetchDatasets'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { DatasetContentSection } from 'src/components/Main/DatasetContentSection'

const CurrentDatasetInfoContainer = styled(ContainerBase)`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
`

const CurrentDatasetInfoHeader = styled.section`
  display: flex;
  margin-bottom: 0.5rem;
  margin-top: 7px;
`

const DatasetInfoH4 = styled.h4`
  flex: 1;
  margin: auto 0;
  margin-top: 12px;
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

export function DatasetCurrent() {
  useUpdatedDataset()

  const { t } = useTranslationSafe()
  const dataset = useRecoilValue(datasetSingleCurrentAtom)

  if (!dataset) {
    return null
  }

  return (
    <CurrentDatasetInfoContainer>
      <CurrentDatasetInfoHeader>
        <DatasetInfoH4>{t('Selected dataset')}</DatasetInfoH4>
        <ButtonRun singleDatasetMode />
      </CurrentDatasetInfoHeader>
      <Container>
        <Header>
          <DatasetInfoCompact dataset={dataset} />
        </Header>
        <Main>
          <DatasetContentSection dataset={dataset} />
        </Main>
      </Container>
    </CurrentDatasetInfoContainer>
  )
}
