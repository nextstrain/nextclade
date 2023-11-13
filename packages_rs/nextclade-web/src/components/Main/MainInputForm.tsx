import { useRouter } from 'next/router'
import React, { useCallback, useMemo } from 'react'
import { isNil } from 'lodash'
import { useRecoilValue } from 'recoil'
import { ButtonRun } from 'src/components/Main/ButtonRun'
import { useRunAnalysis } from 'src/hooks/useRunAnalysis'
import { shouldSuggestDatasetsOnDatasetPageAtom } from 'src/state/settings.state'
import styled from 'styled-components'
import { hasRequiredInputsAtom } from 'src/state/inputs.state'
import { datasetCurrentAtom } from 'src/state/dataset.state'
import { DatasetCurrentSummary } from 'src/components/Main/DatasetCurrentSummary'
import { MainSectionTitle } from 'src/components/Main/MainSectionTitle'
import { QuerySequenceFilePicker } from 'src/components/Main/QuerySequenceFilePicker'
import { useUpdatedDatasetIndex } from 'src/io/fetchDatasets'
import { ButtonChangeDataset, DatasetNoneSection } from 'src/components/Main/ButtonChangeDataset'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { useRunSeqAutodetect } from 'src/hooks/useRunSeqAutodetect'
import { QuerySequenceList } from './QuerySequenceList'
import { AutosuggestionOnMainPageToggle } from './SuggestionPanel'

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

function MainWizard() {
  return (
    <Container>
      <Main>
        <StepLanding />
      </Main>
    </Container>
  )
}

function StepLanding() {
  const { push } = useRouter()
  const runAutodetect = useRunSeqAutodetect()
  const hasRequiredInputs = useRecoilValue(hasRequiredInputsAtom)
  const shouldSuggestDatasets = useRecoilValue(shouldSuggestDatasetsOnDatasetPageAtom)

  const toDatasetSelection = useCallback(() => {
    void push('/dataset') // eslint-disable-line no-void
    if (shouldSuggestDatasets && hasRequiredInputs) {
      runAutodetect()
    }
  }, [hasRequiredInputs, push, runAutodetect, shouldSuggestDatasets])

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
        <AutosuggestionOnMainPageToggle />
      </Footer>

      <Footer>
        <ButtonChangeDataset className="mr-auto my-2" onClick={toDatasetSelection} />
        <ButtonRun className="ml-auto my-2" onClick={run} />
      </Footer>
    </Container>
  )
}
