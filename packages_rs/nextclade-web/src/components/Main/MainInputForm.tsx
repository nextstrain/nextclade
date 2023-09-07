import React from 'react'
import { QuerySequenceFilePicker } from 'src/components/Main/QuerySequenceFilePicker'
import styled from 'styled-components'
import { Col as ColBase, Row as RowBase } from 'reactstrap'
import { DatasetSelector } from 'src/components/Main/DatasetSelector'
import { useUpdatedDatasetIndex } from 'src/io/fetchDatasets'

const Container = styled.div`
  height: 100%;
  overflow: hidden;
`

const Row = styled(RowBase)`
  overflow: hidden;
  height: 100%;
`

const Col = styled(ColBase)`
  overflow: hidden;
  height: 100%;
`

export function MainInputForm() {
  // This periodically fetches dataset index and updates the list of datasets.
  useUpdatedDatasetIndex()

  return (
    <Container>
      <Row noGutters className="flex-column-reverse flex-lg-row">
        <Col lg={6}>
          <DatasetSelector />
        </Col>
        <Col lg={6}>
          <QuerySequenceFilePicker />
        </Col>
      </Row>
    </Container>
  )
}
