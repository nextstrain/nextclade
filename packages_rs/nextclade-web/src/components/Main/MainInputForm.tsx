import React, { useCallback, useEffect, useMemo } from 'react'
import { isNil } from 'lodash'
import { useRouter } from 'next/router'
import { Col, Row } from 'reactstrap'
import { useRecoilState, useRecoilValue } from 'recoil'
import { CardL1 as CardL1Base, CardL1Body as CardL1BodyBase, CardL1Header } from 'src/components/Common/Card'
import styled from 'styled-components'
import { SuggestionAlertMainPage } from 'src/components/Main/SuggestionAlertMainPage'
import { AutodetectRunState, autodetectRunStateAtom } from 'src/state/autodetect.state'
import { datasetCurrentAtom } from 'src/state/dataset.state'
import { hasRequiredInputsAtom, useQuerySeqInputs } from 'src/state/inputs.state'
import { shouldSuggestDatasetsOnDatasetPageAtom } from 'src/state/settings.state'
import { useDatasetSuggestionResults, useRunSeqAutodetect } from 'src/hooks/useRunSeqAutodetect'
import { useUpdatedDatasetIndex } from 'src/io/fetchDatasets'
import { ButtonChangeDataset, DatasetNoneSection } from 'src/components/Main/ButtonChangeDataset'
import { ButtonRun } from 'src/components/Main/ButtonRun'
import { DatasetCurrentSummary } from 'src/components/Main/DatasetCurrentSummary'
import { MainSectionTitle } from 'src/components/Main/MainSectionTitle'
import { QuerySequenceFilePicker } from 'src/components/Main/QuerySequenceFilePicker'
import { QuerySequenceList } from 'src/components/Main/QuerySequenceList'
import { SelectDatasetHelp } from 'src/components/Help/SelectDatasetHelp'
import { SuggestionPanel } from 'src/components/Main/SuggestionPanel'
import { useRunAnalysis } from 'src/hooks/useRunAnalysis'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

const ContainerFixed = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 100%;
  margin: 0 auto;
  max-width: 1200px;
`

const Container = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
`

const Header = styled.div`
  display: flex;
  flex: 0;
  padding-left: 10px;
  margin-top: 10px;
  margin-bottom: 3px;
`

const Main = styled.div`
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  margin: -12px;
  padding: 12px;
  overflow: hidden;
`

const RowCustom = styled(Row)`
  display: flex;
  flex-direction: row;
  width: 100%;
  margin: -12px;
  padding: 12px;
  margin-left: auto;
  margin-right: auto;
  overflow: hidden;
`

export function Landing() {
  // This periodically fetches dataset index and updates the list of datasets.
  useUpdatedDatasetIndex()

  return (
    <ContainerFixed>
      <Header>
        <MainSectionTitle />
      </Header>

      <Main className="mt-4 mb-2">
        <RowCustom>
          <Col md={6} className="d-flex flex-column h-100">
            <LandingCardQuerySeqPicker />
          </Col>

          <Col md={6}>
            <LandingCardDataset />
          </Col>
        </RowCustom>
      </Main>
    </ContainerFixed>
  )
}

export function LandingCardQuerySeqPicker() {
  const { t } = useTranslationSafe()
  const { qryInputs } = useQuerySeqInputs()

  const title = useMemo(() => {
    if (qryInputs.length > 0) {
      return t('Add more sequence data')
    }
    return t('Provide sequence data')
  }, [qryInputs.length, t])

  return (
    <CardL1 className="d-flex flex-column h-100">
      <CardL1Header>
        <CardTitle title={title}>{title}</CardTitle>
      </CardL1Header>
      <CardL1Body className="d-flex flex-column h-100">
        <QuerySequenceFilePicker />
        <QuerySequenceList />
      </CardL1Body>
    </CardL1>
  )
}

export function LandingCardDataset() {
  const { t } = useTranslationSafe()
  const dataset = useRecoilValue(datasetCurrentAtom)
  const text = useMemo(() => {
    if (isNil(dataset)) {
      return t('Select reference dataset')
    }
    return t('Selected reference dataset')
  }, [dataset, t])

  return (
    <CardL1 className="d-flex flex-column h-100">
      <CardL1Header>
        <CardTitle>
          {text}
          <SelectDatasetHelp />
        </CardTitle>
      </CardL1Header>
      <CardL1Body className="d-flex flex-column h-100">
        <DatasetCurrentOrSelectButton />
      </CardL1Body>
    </CardL1>
  )
}

const CardL1 = styled(CardL1Base)``

const CardL1Body = styled(CardL1BodyBase)`
  //min-height: 386px;
`

export const CardTitle = styled.h4`
  display: inline-flex;
  flex: 1 0;
  padding-left: 0.75rem;
  margin: auto 0;
  white-space: nowrap;
  text-overflow: ellipsis;
`

function DatasetCurrentOrSelectButton() {
  const run = useRunAnalysis()
  const [dataset, setDataset] = useRecoilState(datasetCurrentAtom)
  const { topSuggestion } = useDatasetSuggestionResults()

  useEffect(() => {
    if (!dataset) {
      setDataset(topSuggestion)
    }
  }, [dataset, setDataset, topSuggestion])

  const { push } = useRouter()
  const runAutodetect = useRunSeqAutodetect()
  const hasRequiredInputs = useRecoilValue(hasRequiredInputsAtom)
  const shouldSuggestDatasets = useRecoilValue(shouldSuggestDatasetsOnDatasetPageAtom)
  const autodetectRunState = useRecoilValue(autodetectRunStateAtom)
  const toDatasetSelection = useCallback(() => {
    // eslint-disable-next-line no-void
    void push('/dataset').then(() => {
      if (shouldSuggestDatasets && hasRequiredInputs && autodetectRunState !== AutodetectRunState.Started) {
        runAutodetect()
      }
      return undefined
    })
  }, [autodetectRunState, hasRequiredInputs, push, runAutodetect, shouldSuggestDatasets])

  if (!dataset) {
    return (
      <Container>
        <Row noGutters className="mb-1">
          <Col>
            <SuggestionPanel />
          </Col>
        </Row>

        <Row noGutters className="my-1">
          <Col>
            <DatasetNoneSection toDatasetSelection={toDatasetSelection} />
          </Col>
        </Row>

        <SuggestionAlertMainPage className="mt-1 w-100" />
      </Container>
    )
  }

  return (
    <Container>
      <Row noGutters className="mb-1">
        <Col>
          <SuggestionPanel />
        </Col>
      </Row>

      <Row noGutters className="my-1">
        <Col>
          <DatasetCurrentSummary />
        </Col>
      </Row>

      <Row noGutters className="my-1">
        <Col className="d-flex w-100">
          <ButtonChangeDataset className="mr-auto" onClick={toDatasetSelection} />
          <ButtonRun className="ml-auto" onClick={run} />
        </Col>
      </Row>

      <SuggestionAlertMainPage className="mt-1 w-100" />
    </Container>
  )
}
