import { isEmpty, isNil } from 'lodash'
import { useRouter } from 'next/router'
import React, { useCallback, useEffect, useMemo } from 'react'
import { Col, Row } from 'reactstrap'
import { useRecoilState, useRecoilValue } from 'recoil'
import { datasetSingleCurrentAtom } from 'src/state/dataset.state'
import styled from 'styled-components'
import { DatasetSummary } from 'src/components/Main/DatasetCurrentSummary'
import { ButtonChangeDataset, DatasetNoneSection } from 'src/components/Main/ButtonChangeDataset'
import { ButtonRun } from 'src/components/Main/ButtonRun'
import { SuggestionAlertMainPage } from 'src/components/Main/SuggestionAlertMainPage'
import { SuggestionPanel } from 'src/components/Main/SuggestionPanel'
import { useRunAnalysis } from 'src/hooks/useRunAnalysis'
import { autodetectShouldSetCurrentDatasetAtom, firstTopSuggestedDatasetAtom } from 'src/state/autodetect.state'

export function SectionDatasetSingle() {
  const { push } = useRouter()

  const run = useRunAnalysis({ isSingle: true })
  const [datasetCurrent, setDatasetCurrent] = useRecoilState(datasetSingleCurrentAtom)
  const autodetectShouldSetCurrentDataset = useRecoilValue(autodetectShouldSetCurrentDatasetAtom)
  const firstTopSuggestedDataset = useRecoilValue(firstTopSuggestedDatasetAtom)

  useEffect(() => {
    if (
      (isNil(datasetCurrent) || isEmpty(datasetCurrent) || autodetectShouldSetCurrentDataset) &&
      !isEmpty(firstTopSuggestedDataset)
    ) {
      setDatasetCurrent(firstTopSuggestedDataset)
    }
  }, [autodetectShouldSetCurrentDataset, datasetCurrent, firstTopSuggestedDataset, setDatasetCurrent])

  const toDatasetSelection = useCallback(() => {
    // eslint-disable-next-line no-void
    void push('/dataset')
  }, [push])

  const content = useMemo(() => {
    if (isNil(datasetCurrent) || isEmpty(datasetCurrent) || isNil(datasetCurrent)) {
      return <DatasetNoneSection toDatasetSelection={toDatasetSelection} />
    }
    return (
      <>
        <Row noGutters className="my-1">
          <Col>
            <DatasetSummary dataset={datasetCurrent} />
          </Col>
        </Row>

        <Row noGutters className="my-1">
          <Col className="d-flex w-100">
            <ButtonChangeDataset className="mr-auto" onClick={toDatasetSelection} />
            <ButtonRun className="ml-auto" onClick={run} singleDatasetMode />
          </Col>
        </Row>
      </>
    )
  }, [datasetCurrent, run, toDatasetSelection])

  return (
    <Container>
      <Row noGutters className="mb-1">
        <Col>
          <SuggestionPanel />
        </Col>
      </Row>

      {content}

      <SuggestionAlertMainPage className="mt-1 w-100" />
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
`
