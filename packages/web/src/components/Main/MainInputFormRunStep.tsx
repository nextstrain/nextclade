import React from 'react'
import { Col, Container, Row } from 'reactstrap'

import { MainInputFormSequenceFilePicker } from 'src/components/Main/MainInputFormSequenceFilePicker'
import { DatasetCurrent } from './DatasetCurrent'

export function MainInputFormRunStep() {
  return (
    <Container>
      <Row noGutters>
        <Col>
          <DatasetCurrent />
        </Col>
      </Row>

      <Row noGutters>
        <Col>
          <MainInputFormSequenceFilePicker />
        </Col>
      </Row>
    </Container>
  )
}
