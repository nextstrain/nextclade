import React from 'react'

import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'
import { Col, Row } from 'reactstrap'

import { Subtitle, Title } from 'src/components/Main/Title'

export function MainSectionTitle() {
  const { t } = useTranslation()

  return (
    <Row className="hero-bg text-center mx-auto">
      <Col>
        <Title />
        <Subtitle>{t('Clade assignment, mutation calling, and sequence quality checks')}</Subtitle>
      </Col>
    </Row>
  )
}
