import React from 'react'
import { Col, Row, UncontrolledAlert } from 'reactstrap'
import styled from 'styled-components'
import { LinkExternal } from 'src/components/Link/LinkExternal'
import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'
import { Subtitle, Title } from 'src/components/Main/Title'

export function MainSectionTitle() {
  const { t } = useTranslation()

  return (
    <Row noGutters className="hero-bg text-center mb-lg-3 mb-sm-2">
      <Col>
        <Title />
        <Subtitle>{t('Clade assignment, mutation calling, and sequence quality checks')}</Subtitle>
        <DeprecationMessage />
      </Col>
    </Row>
  )
}

function DeprecationMessage() {
  const { t } = useTranslation()
  return (
    <Row noGutters className="w-100 d-flex">
      <Col className="w-100 d-flex">
        <DeprecationAlert closeClassName="d-none" fade={false} color="warning" className="py-2 px-2">
          {t(
            'This outdated version is preserved for reference only. The software and data will no longer receive updates. We recommend using the latest version at: {{ url }}',
          )}
          <LinkExternal href="https://clades.nextstrain.org">{'https://clades.nextstrain.org'}</LinkExternal>
        </DeprecationAlert>
      </Col>
    </Row>
  )
}

const DeprecationAlert = styled(UncontrolledAlert)`
  max-width: 600px;
  margin: 1rem auto;
`
