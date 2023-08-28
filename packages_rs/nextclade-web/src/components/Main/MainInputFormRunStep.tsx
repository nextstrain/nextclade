import React from 'react'

import { Col, Container, Row } from 'reactstrap'
import styled from 'styled-components'

import { MainInputFormSequenceFilePicker } from 'src/components/Main/MainInputFormSequenceFilePicker'
import { DatasetCurrent } from './DatasetCurrent'

const MainInputFormContainer = styled(Container)`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  margin: 0;
  padding: 0;
`

export function MainInputFormRunStep() {
  return (
    <MainInputFormContainer fluid>
      <Row noGutters>
        <Col>
          <DatasetCurrent />
        </Col>
      </Row>

      <Row noGutters className="my-3">
        <Col>
          <MainInputFormSequenceFilePicker />
        </Col>
      </Row>
    </MainInputFormContainer>
  )
}
