import React from 'react'

import { Col, Container, Row } from 'reactstrap'
import styled from 'styled-components'

import { device } from 'src/theme'
import { DatasetCurrent } from 'src/components/Main/DatasetCurrent'
import { MainInputFormSequenceFilePicker } from 'src/components/Main/MainInputFormSequenceFilePicker'
import { MainSectionTitle } from 'src/components/Main/MainSectionTitle'

const MainInputFormContainer = styled(Container)`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
`

const TitleContainer = styled.div`
  display: block;

  @media ${device.desktop} {
    display: none;
  }
`

export function MainInputFormRunStep() {
  return (
    <MainInputFormContainer fluid>
      <TitleContainer>
        <MainSectionTitle />
      </TitleContainer>

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
