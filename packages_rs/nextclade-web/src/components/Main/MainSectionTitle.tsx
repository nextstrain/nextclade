import React from 'react'
import { Col, Row, RowProps } from 'reactstrap'
import { useTranslation } from 'react-i18next'

import { Subtitle, Title } from 'src/components/Main/Title'

export function MainSectionTitle(props: RowProps) {
  const { t } = useTranslation()

  return (
    <Row noGutters className="hero-bg text-center mb-lg-3 mb-sm-2" {...props}>
      <Col className="d-flex flex-column">
        <Title />
        <Subtitle>{t('Clade assignment, mutation calling, and sequence quality checks')}</Subtitle>
      </Col>
    </Row>
  )
}
