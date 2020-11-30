import React, { useState } from 'react'

import { connect } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { ToggleTwoLabels as ToggleTwoLabelsBase } from 'src/components/Common/ToggleTwoLabels'
import { ColFlexHorizontal } from 'src/components/Main/FilePicker'
import { setShowAdvancedControls } from 'src/state/settings/settings.actions'
import styled from 'styled-components'
import { Col, Row } from 'reactstrap'

import { VirusName } from 'src/algorithms/defaults/virusNames'
import { MainSectionHeroFeatures } from 'src/components/Main/MainSectionHeroFeatures'
import type { State } from 'src/state/reducer'
import { MainSectionHeroControlsSimple } from 'src/components/Main/MainSectionHeroControlsSimple'
import { MainSectionHeroControlsAdvanced } from 'src/components/Main/MainSectionHeroControlsAdvanced'
import { CardL1, CardL1Body } from 'src/components/Common/Card'
import type { DropdownOption } from 'src/components/Common/DropdownOption'
import { Dropdown as DropdownBase } from 'src/components/Common/Dropdown'

const Dropdown = styled(DropdownBase)`
  flex: 0 0 230px;
  margin-right: auto;
  margin-left: 5px;
`

const AdvancedToggleWrapper = styled.div`
  flex: 0 0 320px;
  margin-left: 5px;
  margin-top: 7px;
  margin-bottom: 10px;
  display: flex;
  width: 100%;
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

  const [current, setCurrent] = useState<DropdownOption<string>>()

  const virusNameDefault = VirusName.SARS_COV_2
  const virusNameOptionDefault = { value: virusNameDefault, label: virusNameDefault }
  const virusNameOptions = Object.values(VirusName).map((name) => ({ value: name, label: name }))

  return (
    <Row noGutters className="hero-content">
      {!showAdvancedControls && (
        <Col xl={6} className="px-lg-4 hero-content-left">
          <MainSectionHeroFeatures />
        </Col>
      )}

      <Col xl={showAdvancedControls ? 12 : 6} className="hero-content-right">
        <CardL1>
          <CardL1Body>
            <Row noGutters>
              <Col lg={showAdvancedControls && 4} xl={showAdvancedControls && 0} />

              <ColFlexHorizontal lg={showAdvancedControls && 8} xl={!showAdvancedControls && 12}>
                <Dropdown
                  identifier="virus.name"
                  options={virusNameOptions}
                  defaultOption={virusNameOptionDefault}
                  value={current}
                  onOptionChange={setCurrent}
                />

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
