import React from 'react'

import { Col, Row } from 'reactstrap'
import styled from 'styled-components'
import { connect } from 'react-redux'
import { useTranslation } from 'react-i18next'

import { ToggleTwoLabels as ToggleTwoLabelsBase } from 'src/components/Common/ToggleTwoLabels'
import { PreviousResultsCard } from 'src/components/Main/PreviousResultsCard'
import { setShowAdvancedControls } from 'src/state/settings/settings.actions'
import { MainSectionHeroFeatures } from 'src/components/Main/MainSectionHeroFeatures'
import type { State } from 'src/state/reducer'
import { MainSectionHeroControlsSimple } from 'src/components/Main/MainSectionHeroControlsSimple'
import { MainSectionHeroControlsAdvanced } from 'src/components/Main/MainSectionHeroControlsAdvanced'
import { CardL1, CardL1Body } from 'src/components/Common/Card'
import { DatasetSelector } from 'src/components/Main/DatasetSelector'

export const ColFlexHorizontal = styled(Col)`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  width: 100%;
`

const AdvancedToggleWrapper = styled.div`
  flex: 0 0 320px;
  margin-left: 5px;
  margin-top: 7px;
  margin-bottom: 10px;
  display: flex;
  width: 100%;

  @media (max-width: 767.98px) {
    margin-left: auto;
    margin-right: auto;
  }
`

const ToggleTwoLabels = styled(ToggleTwoLabelsBase)``

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

export const MainSectionHero = connect(mapStateToProps, mapDispatchToProps)(MainSectionHeroDisconnected)

export function MainSectionHeroDisconnected({ showAdvancedControls, setShowAdvancedControls }: MainSectionHeroProps) {
  const { t } = useTranslation()

  return (
    <Row noGutters>
      <Col xl={showAdvancedControls ? 4 : 6}>
        {!showAdvancedControls && <MainSectionHeroFeatures />}
        {showAdvancedControls && <PreviousResultsCard />}
      </Col>

      <Col xl={showAdvancedControls ? 8 : 6}>
        <CardL1>
          <CardL1Body>
            <Row noGutters>
              <ColFlexHorizontal>
                <DatasetSelector />

                <AdvancedToggleWrapper>
                  <ToggleTwoLabels
                    identifier="toggle-advanced-controls"
                    checked={showAdvancedControls}
                    onCheckedChanged={setShowAdvancedControls}
                    labelRight={t('Simple mode')}
                    labelLeft={t('Advanced mode')}
                  />
                </AdvancedToggleWrapper>
              </ColFlexHorizontal>
            </Row>

            <Row noGutters>
              <Col>
                {showAdvancedControls ? <MainSectionHeroControlsAdvanced /> : <MainSectionHeroControlsSimple />}
              </Col>
            </Row>
          </CardL1Body>
        </CardL1>
      </Col>
    </Row>
  )
}
