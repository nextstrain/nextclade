import React from 'react'
import { Row as RowBase, Col as ColBase } from 'reactstrap'
import styled from 'styled-components'
import { QuerySequenceFilePicker } from 'src/components/Main/QuerySequenceFilePicker'
import { DatasetCurrent } from 'src/components/Main/DatasetCurrent'

export function WizardManualStep() {
  return (
    <Container>
      <Row noGutters className="flex-column-reverse flex-lg-row h-100">
        <Col lg={6}>
          <DatasetCurrent />
        </Col>
        <Col lg={6}>
          <QuerySequenceFilePicker />
        </Col>
      </Row>
    </Container>
  )
}

const Container = styled.div`
  width: 100% !important;

  @media (min-width: 991.98px) {
    overflow: hidden;
    height: 100%;
  }
`

const Row = styled(RowBase)`
  width: 100% !important;

  @media (min-width: 991.98px) {
    overflow: hidden;
    height: 100%;
  }
`

const Col = styled(ColBase)`
  width: 100% !important;

  @media (min-width: 991.98px) {
    overflow: hidden;
    height: 100%;
  }
`
