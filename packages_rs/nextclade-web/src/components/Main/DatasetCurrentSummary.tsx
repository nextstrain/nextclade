import React from 'react'
import { Col, Row } from 'reactstrap'
import { useRecoilValue } from 'recoil'
import styled from 'styled-components'
import { useUpdatedDataset } from 'src/io/fetchDatasets'
import { datasetCurrentAtom } from 'src/state/dataset.state'
import { DatasetCurrentUpdateNotification } from 'src/components/Main/DatasetCurrentUpdateNotification'
import { DatasetInfo } from 'src/components/Main/DatasetInfo'

export function DatasetCurrentSummary() {
  // Periodically checks if there's local update for the current dataset
  useUpdatedDataset()

  const dataset = useRecoilValue(datasetCurrentAtom)

  if (!dataset) {
    return null
  }

  return (
    <Container>
      <DatasetCurrentUpdateNotification />

      <Row noGutters className="w-100">
        <Col className="d-flex">
          <DatasetInfo dataset={dataset} />
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
`
