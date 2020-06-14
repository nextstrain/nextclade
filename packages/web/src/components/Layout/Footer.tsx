import React from 'react'

import { useTranslation } from 'react-i18next'
import { Col, Container, Row } from 'reactstrap'

export default function Footer() {
  const { t } = useTranslation()

  return (
    <Container fluid className="py-3">
      <Row noGutters>
        <Col xs={12} md={6} className="text-center text-md-left mb-2 mb-md-0">
          {t('Web Clades (c) 2020 neherlab')}
        </Col>
      </Row>
    </Container>
  )
}
