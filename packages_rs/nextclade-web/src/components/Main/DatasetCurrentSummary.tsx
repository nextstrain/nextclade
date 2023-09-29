import React from 'react'
import { Col, Row } from 'reactstrap'
import { useRecoilValue } from 'recoil'
import styled from 'styled-components'
import { ButtonChangeDataset } from 'src/components/Main/ButtonChangeDataset'
import { ButtonRun } from 'src/components/Main/ButtonRun'
import { useRunAnalysis } from 'src/hooks/useRunAnalysis'
import { useUpdatedDataset } from 'src/io/fetchDatasets'
import { datasetCurrentAtom } from 'src/state/dataset.state'
import { DatasetCurrentUpdateNotification } from 'src/components/Main/DatasetCurrentUpdateNotification'
import { DatasetInfo } from 'src/components/Main/DatasetInfo'

export interface DatasetCurrentSummaryProps {
  toDatasetSelection(): void
}

export function DatasetCurrentSummary({ toDatasetSelection }: DatasetCurrentSummaryProps) {
  // Periodically checks if there's local update for the current dataset
  useUpdatedDataset()

  const dataset = useRecoilValue(datasetCurrentAtom)
  const run = useRunAnalysis()

  if (!dataset) {
    return null
  }

  return (
    <Container>
      <DatasetCurrentUpdateNotification />

      <Row noGutters className="w-100">
        <Col className="d-flex">
          <FlexLeft>
            <DatasetInfo dataset={dataset} />
          </FlexLeft>

          <FlexRight>
            <div className="d-flex flex-column">
              <ButtonChangeDataset className="mb-2" onClick={toDatasetSelection} />
              <ButtonRun onClick={run} />
            </div>
          </FlexRight>
        </Col>
      </Row>
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  padding: 12px;
  border: 1px #ccc9 solid;
  border-radius: 5px;
  margin: 0.5rem auto;
`

const FlexLeft = styled.div`
  flex: 1;
`

const FlexRight = styled.div`
  margin-left: 1rem;
`
