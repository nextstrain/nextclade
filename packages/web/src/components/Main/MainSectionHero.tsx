import React from 'react'

import { connect } from 'react-redux'
import { Col, Row } from 'reactstrap'

import type { State } from 'src/state/reducer'
import { MainSectionHeroControlsSimple } from 'src/components/Main/MainSectionHeroControlsSimple'
import { MainSectionHeroControlsAdvanced } from 'src/components/Main/MainSectionHeroControlsAdvanced'
import { MainToggleAdvancedControls } from 'src/components/Main/MainToggleAdvancedControls'

export interface MainSectionHeroProps {
  showAdvancedControls: boolean
}

const mapStateToProps = (state: State) => ({
  showAdvancedControls: state.settings.showAdvancedControls,
})

const mapDispatchToProps = {}

export const MainSectionHero = connect(mapStateToProps, mapDispatchToProps)(MainSectionHeroDisconnected)

export function MainSectionHeroDisconnected({ showAdvancedControls }: MainSectionHeroProps) {
  return (
    <>
      <Row noGutters>
        <Col className="w-100 d-flex">
          <MainToggleAdvancedControls />
        </Col>
      </Row>

      {showAdvancedControls ? <MainSectionHeroControlsAdvanced /> : <MainSectionHeroControlsSimple />}
    </>
  )
}
