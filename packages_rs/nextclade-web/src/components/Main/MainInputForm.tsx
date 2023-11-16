import { useRouter } from 'next/router'
import React, { useCallback, useEffect, useMemo } from 'react'
import { isNil } from 'lodash'
import { useRecoilState, useRecoilValue } from 'recoil'
import { ButtonRun } from 'src/components/Main/ButtonRun'
import { SuggestionPanel } from 'src/components/Main/SuggestionPanel'
import { useRunAnalysis } from 'src/hooks/useRunAnalysis'
import { AutodetectRunState, autodetectRunStateAtom } from 'src/state/autodetect.state'
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
import { useDatasetSuggestionResults, useRunSeqAutodetect } from 'src/hooks/useRunSeqAutodetect'
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
`

const FooterWithoutOverflow = styled(Footer)`
  overflow: hidden;
`

export function Landing() {
  // This periodically fetches dataset index and updates the list of datasets.
  useUpdatedDatasetIndex()

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

      <Main className="mt-4">
        <ContainerColumns>
          <QuerySequenceFilePicker />
          <DatasetCurrentOrSelectButton toDatasetSelection={toDatasetSelection} />
        </ContainerColumns>
      </Main>

      <FooterWithoutOverflow>
        <Container>
          <Main>
            <QuerySequenceList />
          </Main>
        </Container>
      </FooterWithoutOverflow>
    </ContainerFixed>
  )
}

export interface DatasetCurrentOrSelectButtonProps {
  toDatasetSelection(): void
}

function DatasetCurrentOrSelectButton({ toDatasetSelection }: DatasetCurrentOrSelectButtonProps) {
  const { t } = useTranslationSafe()
  const run = useRunAnalysis()

  const [dataset, setDataset] = useRecoilState(datasetCurrentAtom)
  const { topSuggestion } = useDatasetSuggestionResults()
  const [autodetectRunState, setAutodetectRunState] = useRecoilState(autodetectRunStateAtom)
  useEffect(() => {
    if (autodetectRunState === AutodetectRunState.Done) {
      setDataset(topSuggestion)
      setAutodetectRunState(AutodetectRunState.Idle)
    }
  }, [autodetectRunState, setAutodetectRunState, setDataset, topSuggestion])

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

        <Footer>
          <SuggestionPanel />
        </Footer>
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
        <SuggestionPanel />
      </Footer>

      <Footer>
        <ButtonChangeDataset className="mr-auto my-2" onClick={toDatasetSelection} />
        <ButtonRun className="ml-auto my-2" onClick={run} />
      </Footer>
    </Container>
  )
}
