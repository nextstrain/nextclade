import React from 'react'
import { ButtonRun } from 'src/components/Main/ButtonRun'
import { QuerySequenceList } from 'src/components/Main/QuerySequenceList'
import { useRunAnalysis } from 'src/hooks/useRunAnalysis'
import styled from 'styled-components'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import { Row as RowBase, Col as ColBase, Button } from 'reactstrap'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { datasetCurrentAtom } from 'src/state/dataset.state'
import { DatasetAutosuggestionResultsList } from 'src/components/Main/DatasetSelector'
import { DatasetCurrent } from 'src/components/Main/DatasetCurrent'

export interface StepDatasetSelectionProps {
  toLanding(): void
}

export function StepDatasetSelection({ toLanding }: StepDatasetSelectionProps) {
  const { t } = useTranslationSafe()
  const run = useRunAnalysis()

  return (
    <Container>
      <Main>
        <DatasetSelection />
      </Main>
      <Footer>
        <Button color="primary" onClick={toLanding}>
          {t('Back')}
        </Button>

        <ButtonRun className="ml-auto" onClick={run} />
      </Footer>
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
`

const Main = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
`

const MainFixed = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-height: 20%;
  margin-top: 12px;
  padding: 0 15px;
`

const Footer = styled.div`
  display: flex;
  flex: 0;
`

function DatasetSelection() {
  const dataset = useRecoilValue(datasetCurrentAtom)
  const setDataset = useSetRecoilState(datasetCurrentAtom)

  return (
    <Wrapper>
      <Row noGutters className="flex-column flex-lg-row h-100">
        <Col lg={6}>
          <Container>
            <MainFixed>
              <QuerySequenceList />
            </MainFixed>
            <Main>
              <DatasetAutosuggestionResultsList datasetHighlighted={dataset} onDatasetHighlighted={setDataset} />
            </Main>
          </Container>
        </Col>
        <Col lg={6}>
          <DatasetCurrent />
        </Col>
      </Row>
    </Wrapper>
  )
}

const Wrapper = styled.div`
  display: flex;
  flex: 1;
  width: 100% !important;

  @media (min-width: 991.98px) {
    overflow: hidden;
    height: 100%;
  }
`

const Row = styled(RowBase)`
  display: flex;
  flex: 1;
  width: 100% !important;

  @media (min-width: 991.98px) {
    overflow: hidden;
    height: 100%;
  }
`

const Col = styled(ColBase)`
  display: flex;
  flex: 1;
  width: 100% !important;

  @media (min-width: 991.98px) {
    overflow: hidden;
    height: 100%;
  }
`
