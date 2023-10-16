import React from 'react'
import { QuerySequenceFilePicker } from 'src/components/Main/QuerySequenceFilePicker'
import styled from 'styled-components'
import { Col as ColBase, Row as RowBase } from 'reactstrap'
import { useUpdatedDatasetIndex } from 'src/io/fetchDatasets'
import { DatasetSelector } from 'src/components/Main/DatasetSelector'

const Container = styled.div`
  max-width: ${(props) => props.theme.containerMaxWidths.twoxl};
  margin: 0 auto;
  height: 100%;
  overflow: hidden;
  margin-top: 10px;
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
      <Row noGutters className="flex-column flex-lg-row">
        <Col lg={6} className="">
          <QuerySequenceFilePicker />
        </Col>
        <Col lg={6} className="">
          <DatasetSelector />
        </Col>
      </Row>
    </Container>
  )
}
