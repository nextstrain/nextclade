import React from 'react'

import { Col, Row } from 'reactstrap'

import { LayoutMain } from 'src/components/Layout/LayoutMain'
import { MainSectionHero } from 'src/components/Main/MainSectionHero'
import { MainSectionInfo } from 'src/components/Main/MainSectionInfo'
import { MainSectionTitle } from 'src/components/Main/MainSectionTitle'

export function MainPage() {
  return (
    <LayoutMain>
      <Row noGutters className="landing-page-row mx-auto">
        <Col>
          <MainSectionTitle />
          <MainSectionHero />
          <MainSectionInfo />
        </Col>
      </Row>
    </LayoutMain>
  )
}
