import React, { useCallback, useMemo, useState } from 'react'
import { isNil } from 'lodash'
import { useRecoilValue } from 'recoil'
import { ButtonRun } from 'src/components/Main/ButtonRun'
import { useRunAnalysis } from 'src/hooks/useRunAnalysis'
import { shouldSuggestDatasetsAtom } from 'src/state/settings.state'
import styled from 'styled-components'
import { hasRequiredInputsAtom } from 'src/state/inputs.state'
import { datasetCurrentAtom } from 'src/state/dataset.state'
import { ErrorInternal } from 'src/helpers/ErrorInternal'
import { DatasetCurrentSummary } from 'src/components/Main/DatasetCurrentSummary'
import { MainSectionTitle } from 'src/components/Main/MainSectionTitle'
import { QuerySequenceFilePicker } from 'src/components/Main/QuerySequenceFilePicker'
import { StepDatasetSelection } from 'src/components/Main/StepDatasetSelection'
import { useUpdatedDatasetIndex } from 'src/io/fetchDatasets'
import { ButtonChangeDataset, DatasetNoneSection } from 'src/components/Main/ButtonChangeDataset'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { useRunSeqAutodetect } from 'src/hooks/useRunSeqAutodetect'
import { QuerySequenceList } from './QuerySequenceList'

const ContainerFixed = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  width: 100%;
  margin: 0 auto;
  max-width: 1000px;
`

const Container = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
`

const ContainerColumns = styled.div`
  display: flex;
  flex-direction: row;
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
  flex-direction: column;
  overflow: hidden;
`

const Footer = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
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
  const runAutodetect = useRunSeqAutodetect()
  const hasRequiredInputs = useRecoilValue(hasRequiredInputsAtom)
  const shouldSuggestDatasets = useRecoilValue(shouldSuggestDatasetsAtom)

  const toDatasetSelection = useCallback(() => {
    setPage(WizardPage.DatasetSelection)
    if (shouldSuggestDatasets && hasRequiredInputs) {
      runAutodetect()
    }
  }, [hasRequiredInputs, runAutodetect, shouldSuggestDatasets])
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
        <ContainerColumns>
          <QuerySequenceFilePicker />
          <DatasetCurrentOrSelectButton toDatasetSelection={toDatasetSelection} />
        </ContainerColumns>
      </Main>

      <Footer>
        <Container>
          <Main>
            <QuerySequenceList />
          </Main>
        </Container>
      </Footer>
    </ContainerFixed>
  )
}

export interface DatasetCurrentOrSelectProps {
  toDatasetSelection(): void
}

function DatasetCurrentOrSelectButton({ toDatasetSelection }: DatasetCurrentOrSelectProps) {
  const { t } = useTranslationSafe()
  const dataset = useRecoilValue(datasetCurrentAtom)
  const run = useRunAnalysis()

  const text = useMemo(() => {
    if (isNil(dataset)) {
      return t('Select dataset')
    }
    return t('Selected dataset')
  }, [dataset, t])
  if (!dataset) {
    return (
      <Container>
        <Header>
          <h4>{text}</h4>
        </Header>

        <Main>
          <DatasetNoneSection toDatasetSelection={toDatasetSelection} />
        </Main>
      </Container>
    )
  }

  return (
    <Container>
      <Header>
        <h4>{text}</h4>
      </Header>

      <Main>
        <DatasetCurrentSummary />
      </Main>

      <Footer>
        <ButtonChangeDataset className="mr-auto my-2" onClick={toDatasetSelection} />
        <ButtonRun className="ml-auto my-2" onClick={run} />
      </Footer>
    </Container>
  )
}
