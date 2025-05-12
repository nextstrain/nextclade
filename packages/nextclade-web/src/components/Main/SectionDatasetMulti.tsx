import { isEmpty } from 'lodash'
import React, { useMemo } from 'react'
import { Col, Row } from 'reactstrap'
import { useRecoilValue } from 'recoil'
import styled from 'styled-components'
import { DatasetMultiList } from 'src/components/Main/DatasetMultiList'
import { ButtonRun } from 'src/components/Main/ButtonRun'
import { ButtonSuggest, SuggestionPanel } from 'src/components/Main/SuggestionPanel'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { useRunAnalysis } from 'src/hooks/useRunAnalysis'
import { isAutodetectRunningAtom, topSuggestedDatasetsAtom } from 'src/state/autodetect.state'
import { hasRequiredInputsAtom } from 'src/state/inputs.state'

export function SectionDatasetMulti() {
  const run = useRunAnalysis({ isSingle: false })
  const topDatasets = useRecoilValue(topSuggestedDatasetsAtom)

  const content = useMemo(() => {
    if (isEmpty(topDatasets)) {
      return <SectionDatasetMultiEmpty />
    }

    return (
      <>
        <Row noGutters className="my-1">
          <Col>
            <DatasetMultiList />
          </Col>
        </Row>

        <Row noGutters className="my-1">
          <Col className="d-flex w-100">
            <ButtonRun className="ml-auto" onClick={run} singleDatasetMode={false} />
          </Col>
        </Row>
      </>
    )
  }, [run, topDatasets])

  return (
    <Container>
      <Row noGutters className="mb-1">
        <Col>
          <SuggestionPanel />
        </Col>
      </Row>

      {content}
    </Container>
  )
}

function SectionDatasetMultiEmpty() {
  const { t } = useTranslationSafe()
  const hasRequiredInputs = useRecoilValue(hasRequiredInputsAtom)
  const isRunning = useRecoilValue(isAutodetectRunningAtom)
  const content = useMemo(() => {
    if (isRunning) {
      return <>{t('Finding matching datasets...')}</>
    }
    if (hasRequiredInputs) {
      return <ButtonSuggest />
    }
    return <>{t('Please provide sequence data')}</>
  }, [hasRequiredInputs, isRunning, t])
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
