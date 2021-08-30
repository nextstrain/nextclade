import React from 'react'

import { Col, Row } from 'reactstrap'
import styled from 'styled-components'
import { connect } from 'react-redux'

import { PreviousResultsCard } from 'src/components/Main/PreviousResultsCard'
import { setShowAdvancedControls } from 'src/state/settings/settings.actions'
import type { State } from 'src/state/reducer'
import { MainSectionHeroControlsAdvanced } from 'src/components/Main/MainSectionHeroControlsAdvanced'
import { CardL1, CardL1Body } from 'src/components/Common/Card'

export const ColFlexHorizontal = styled(Col)`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  width: 100%;
`

export interface MainSectionHeroProps {
  showAdvancedControls: boolean

  setShowAdvancedControls(showAdvanced: boolean): void
}

const mapStateToProps = (state: State) => ({
  showAdvancedControls: state.settings.showAdvancedControls,
})

const mapDispatchToProps = {
  setShowAdvancedControls,
}

export const MainSectionControls = connect(mapStateToProps, mapDispatchToProps)(MainSectionHeroDisconnected)

export function MainSectionHeroDisconnected({ showAdvancedControls, setShowAdvancedControls }: MainSectionHeroProps) {
  return (
    <Row noGutters>
      <Col xl={6}>
        <PreviousResultsCard />
      </Col>

      <Col xl={6}>
        <CardL1>
          <CardL1Body>
            <Row noGutters>
              <Col>
                <MainSectionHeroControlsAdvanced />
              </Col>
            </Row>
          </CardL1Body>
        </CardL1>
      </Col>
    </Row>
  )
}
