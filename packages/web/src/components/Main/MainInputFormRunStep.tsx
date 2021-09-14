import React from 'react'
import { Col, Container, Row } from 'reactstrap'

import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { MainInputFormSequenceFilePicker } from 'src/components/Main/MainInputFormSequenceFilePicker'
import { DatasetCurrent } from './DatasetCurrent'

export function MainInputFormRunStep() {
  const { t } = useTranslationSafe()

  return (
    <Container>
      <Row noGutters>
        <Col>
          <h3>{t('Provide sequences')}</h3>
        </Col>
      </Row>

      <Row noGutters>
        <Col>
          <MainInputFormSequenceFilePicker />
        </Col>
      </Row>

      <Row noGutters>
        <Col>
          <DatasetCurrent />
        </Col>
      </Row>
    </Container>
  )
}
