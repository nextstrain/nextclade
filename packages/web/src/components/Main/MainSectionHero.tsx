import React, { useMemo, useState } from 'react'

import { connect } from 'react-redux'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { Col, Row } from 'reactstrap'

import { ToggleTwoLabels as ToggleTwoLabelsBase } from 'src/components/Common/ToggleTwoLabels'
import { PreviousResultsCard } from 'src/components/Main/PreviousResultsCard'
import { setShowAdvancedControls } from 'src/state/settings/settings.actions'
import { VirusName } from 'src/algorithms/defaults/virusNames'
import { MainSectionHeroFeatures } from 'src/components/Main/MainSectionHeroFeatures'
import type { State } from 'src/state/reducer'
import { MainSectionHeroControlsSimple } from 'src/components/Main/MainSectionHeroControlsSimple'
import { MainSectionHeroControlsAdvanced } from 'src/components/Main/MainSectionHeroControlsAdvanced'
import { CardL1, CardL1Body } from 'src/components/Common/Card'
import type { DropdownOption } from 'src/components/Common/DropdownOption'
import { Dropdown } from 'src/components/Common/Dropdown'

export const ColFlexHorizontal = styled(Col)`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  width: 100%;
`

const DropdownContainer = styled.div`
  flex: 0 0 230px;
  margin-right: auto;
  margin-left: 5px;

  @media (max-width: 767.98px) {
    margin-left: auto;
    margin-right: auto;
  }
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

  const [current, setCurrent] = useState<DropdownOption<string>>()

  const virusNameDefault = VirusName.SARS_COV_2
  const virusNameOptionDefault = { value: virusNameDefault, label: virusNameDefault }
  const virusNameOptions = Object.values(VirusName).map((name) => ({ value: name, label: name }))

  const virusDropdownTooltip = useMemo(() => `${t('Select a virus')} (${t('Coming soon!')})`, [t])

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
                <DropdownContainer title={virusDropdownTooltip}>
                  <Dropdown
                    identifier="virus.name"
                    options={virusNameOptions}
                    defaultOption={virusNameOptionDefault}
                    value={current}
                    onOptionChange={setCurrent}
                    isDisabled
                  />
                </DropdownContainer>

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
