import React from 'react'

import { useTranslation } from 'react-i18next'
import { Col, Row } from 'reactstrap'

import { Subtitle, Title } from 'src/components/Main/Title'

export function MainSectionTitle() {
  const { t } = useTranslation()

  return (
    <Row noGutters className="hero-bg text-center mb-lg-3 mb-sm-2">
      <Col>
        <Title />
        <Subtitle>{t('Clade assignment, mutation calling, and sequence quality checks')}</Subtitle>
      </Col>
    </Row>
  )
}
