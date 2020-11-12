import React from 'react'

import { Row } from 'reactstrap'

import { MainSectionHeroControls } from 'src/components/Main/MainSectionHeroControls'
import { MainSectionHeroFeatures } from 'src/components/Main/MainSectionHeroFeatures'

export function MainSectionHero() {
  return (
    <Row noGutters className="hero-content">
      <MainSectionHeroFeatures />
      <MainSectionHeroControls />
    </Row>
  )
}
