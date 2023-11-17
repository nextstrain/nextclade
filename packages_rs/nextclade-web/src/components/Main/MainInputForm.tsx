import { isNil } from 'lodash'
import { useRouter } from 'next/router'
import React, { useCallback, useMemo } from 'react'
import { UncontrolledAlert as UncontrolledAlertBase } from 'reactstrap'
import { useRecoilState, useRecoilValue } from 'recoil'
import styled from 'styled-components'
import { ButtonChangeDataset, DatasetNoneSection } from 'src/components/Main/ButtonChangeDataset'
import { ButtonRun } from 'src/components/Main/ButtonRun'
import { DatasetCurrentSummary } from 'src/components/Main/DatasetCurrentSummary'
import { MainSectionTitle } from 'src/components/Main/MainSectionTitle'
import { QuerySequenceFilePicker } from 'src/components/Main/QuerySequenceFilePicker'
import { SuggestionPanel } from 'src/components/Main/SuggestionPanel'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { useRunAnalysis } from 'src/hooks/useRunAnalysis'
import { useDatasetSuggestionResults, useRunSeqAutodetect } from 'src/hooks/useRunSeqAutodetect'
import { useUpdatedDatasetIndex } from 'src/io/fetchDatasets'
import { AutodetectRunState, autodetectRunStateAtom } from 'src/state/autodetect.state'
import { datasetCurrentAtom } from 'src/state/dataset.state'
import { hasRequiredInputsAtom } from 'src/state/inputs.state'
import { shouldSuggestDatasetsOnDatasetPageAtom } from 'src/state/settings.state'
import { QuerySequenceList } from 'src/components/Main/QuerySequenceList'

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

  const [dataset, _0] = useRecoilState(datasetCurrentAtom)
  const { numSuggestions } = useDatasetSuggestionResults()
  const autodetectRunState = useRecoilValue(autodetectRunStateAtom)

  const suggestionAlert = useMemo(() => {
    if (autodetectRunState === AutodetectRunState.Done) {
      if (numSuggestions === 0) {
        return (
          <UncontrolledAlert closeClassName="d-none" fade={false} color="danger" className="w-100">
            <h6 className="font-weight-bold">{t('No datasets found matching your sequences.')}</h6>
            <p className="small">
              {t(
                'Click "Change dataset" to select a dataset manually. If there is no suitable dataset, consider creating and contributing one to Nextclade community dataset collection.',
              )}
            </p>
          </UncontrolledAlert>
        )
      }
      if (numSuggestions > 0) {
        return (
          <UncontrolledAlert closeClassName="d-none" fade={false} color="warning" className="w-100">
            <h6 className="font-weight-bold">{t('Multiple datasets found matching your sequences.')}</h6>
            <p className="small">
              {t('{{ n }} datasets appear to match your data. Click "Change dataset" to select the one to use.', {
                n: numSuggestions,
              })}
            </p>
          </UncontrolledAlert>
        )
      }
    }
    return null
  }, [autodetectRunState, numSuggestions, t])

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

        <Footer>{suggestionAlert}</Footer>
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

      <Footer>{suggestionAlert}</Footer>

      <Footer>
        <ButtonChangeDataset className="mr-auto my-2" onClick={toDatasetSelection} />
        <ButtonRun className="ml-auto my-2" onClick={run} />
      </Footer>
    </Container>
  )
}

const UncontrolledAlert = styled(UncontrolledAlertBase)`
  padding: 0.5rem;

  p {
    margin: 0;
  }
`
