import { isEmpty, isNil } from 'lodash'
import React, { useEffect, useMemo } from 'react'
import { Col, Row } from 'reactstrap'
import { useRecoilState, useRecoilValue } from 'recoil'
import styled from 'styled-components'
import { ButtonRun } from 'src/components/Main/ButtonRun'
import { DatasetCurrentList } from 'src/components/Main/DatasetCurrent'
import { SuggestionAlertMainPage } from 'src/components/Main/SuggestionAlertMainPage'
import { ButtonSuggest, SuggestionPanel } from 'src/components/Main/SuggestionPanel'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { useRunAnalysis } from 'src/hooks/useRunAnalysis'
import { autodetectShouldSetCurrentDatasetAtom, topSuggestedDatasetsAtom } from 'src/state/autodetect.state'
import { datasetsCurrentAtom } from 'src/state/dataset.state'
import { hasRequiredInputsAtom } from 'src/state/inputs.state'

export function SectionDatasetMulti() {
  const run = useRunAnalysis()
  const [datasetsCurrent, setDatasetsCurrent] = useRecoilState(datasetsCurrentAtom)
  const autodetectShouldSetCurrentDataset = useRecoilValue(autodetectShouldSetCurrentDatasetAtom)
  const topDatasets = useRecoilValue(topSuggestedDatasetsAtom)

  useEffect(() => {
    if (isNil(datasetsCurrent) || isEmpty(datasetsCurrent) || autodetectShouldSetCurrentDataset) {
      setDatasetsCurrent(topDatasets)
    }
  }, [autodetectShouldSetCurrentDataset, datasetsCurrent, setDatasetsCurrent, topDatasets])

  const content = useMemo(() => {
    if (isEmpty(datasetsCurrent)) {
      return <SectionDatasetMultiEmpty />
    }

    return (
      <>
        <Row noGutters className="my-1">
          <Col>
            <DatasetCurrentList />
          </Col>
        </Row>

        <Row noGutters className="my-1">
          <Col className="d-flex w-100">
            <ButtonRun className="ml-auto" onClick={run} />
          </Col>
        </Row>
      </>
    )
  }, [datasetsCurrent, run])

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

function SectionDatasetMultiEmpty() {
  const { t } = useTranslationSafe()
  const hasRequiredInputs = useRecoilValue(hasRequiredInputsAtom)
  const content = useMemo(() => {
    if (hasRequiredInputs) {
      return <ButtonSuggest />
    }
    return <>{t('Please provide sequence data')}</>
  }, [hasRequiredInputs, t])
  return (
    <ContainerEmpty>
      <span className="m-auto">{content}</span>
    </ContainerEmpty>
  )
}

const Container = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
`

const ContainerEmpty = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;

  padding: 12px;
  border: 1px #ccc9 solid;
  border-radius: 5px;

  min-height: 200px;
`
