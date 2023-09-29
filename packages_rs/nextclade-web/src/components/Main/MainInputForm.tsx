import React, { useCallback, useMemo, useState } from 'react'
import { useRecoilValue } from 'recoil'
import styled from 'styled-components'
import { DatasetCurrentSummary } from 'src/components/Main/DatasetCurrentSummary'
import { MainSectionTitle } from 'src/components/Main/MainSectionTitle'
import { QuerySequenceFilePicker } from 'src/components/Main/QuerySequenceFilePicker'
import { StepDatasetSelection } from 'src/components/Main/StepDatasetSelection'
import { ErrorInternal } from 'src/helpers/ErrorInternal'
import { datasetCurrentAtom } from 'src/state/dataset.state'
import { useUpdatedDatasetIndex } from 'src/io/fetchDatasets'
import { DatasetNoneSection } from 'src/components/Main/ButtonChangeDataset'

const Container = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
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
  overflow: hidden;
`

const Footer = styled.div`
  display: flex;
  flex: 0;
`

export function MainInputForm() {
  // This periodically fetches dataset index and updates the list of datasets.
  useUpdatedDatasetIndex()

  return <MainWizard />
}

export enum WizardPage {
  Landing,
  DatasetSelection,
}

function MainWizard() {
  const [page, setPage] = useState(WizardPage.Landing)

  const toDatasetSelection = useCallback(() => {
    setPage(WizardPage.DatasetSelection)
  }, [])
  const toLanding = useCallback(() => {
    setPage(WizardPage.Landing)
  }, [])

  const wizard = useMemo(() => {
    switch (page) {
      case WizardPage.Landing:
        return <StepLanding toDatasetSelection={toDatasetSelection} />
      case WizardPage.DatasetSelection:
        return <StepDatasetSelection toLanding={toLanding} />
      default:
        throw new ErrorInternal(`Unexpected page in wizard: '${page}'`)
    }
  }, [page, toDatasetSelection, toLanding])

  return (
    <Container>
      <Main>{wizard}</Main>
    </Container>
  )
}

export interface StepLandingProps {
  toDatasetSelection(): void
}

function StepLanding({ toDatasetSelection }: StepLandingProps) {
  return (
    <ContainerFixed>
      <Header>
        <MainSectionTitle />
      </Header>
      <Main>
        <QuerySequenceFilePicker />
      </Main>
      <Footer>
        <DatasetCurrentOrSelectButton toDatasetSelection={toDatasetSelection} />
      </Footer>
    </ContainerFixed>
  )
}

const ContainerFixed = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  max-width: ${(props) => props.theme.containerMaxWidths.lg};
  margin: 0 auto;
`

export interface DatasetCurrentOrSelectProps {
  toDatasetSelection(): void
}

function DatasetCurrentOrSelectButton({ toDatasetSelection }: DatasetCurrentOrSelectProps) {
  const dataset = useRecoilValue(datasetCurrentAtom)
  if (!dataset) {
    return <DatasetNoneSection toDatasetSelection={toDatasetSelection} />
  }
  return <DatasetCurrentSummary toDatasetSelection={toDatasetSelection} />
}
