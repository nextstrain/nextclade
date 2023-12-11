import React from 'react'
import { Col, Row } from 'reactstrap'
import { useRecoilState } from 'recoil'
import { ButtonLoadExample } from 'src/components/Main/ButtonLoadExample'
import styled from 'styled-components'
import { useUpdatedDataset } from 'src/io/fetchDatasets'
import { datasetCurrentAtom } from 'src/state/dataset.state'
import { DatasetCurrentUpdateNotification } from 'src/components/Main/DatasetCurrentUpdateNotification'
import { DatasetInfo } from 'src/components/Main/DatasetInfo'

export function DatasetCurrentSummary() {
  // Periodically checks if there's local update for the current dataset
  useUpdatedDataset()

  const [dataset, _0] = useRecoilState(datasetCurrentAtom)

  if (!dataset) {
    return null
  }

  return (
    <Container>
      <DatasetCurrentUpdateNotification />

      <Row noGutters className="w-100">
        <Col className="d-flex">
          <DatasetInfo dataset={dataset} showSuggestions />
        </Col>
      </Row>
      <Row noGutters>
        <Col className="d-flex w-100">
          <ButtonLoadExample className="ml-auto" />
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
