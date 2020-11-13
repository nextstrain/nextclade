import React, { useState } from 'react'

import { connect } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { Col, Form, Row } from 'reactstrap'

import type { State } from 'src/state/reducer'
import { MainSectionHeroControlsSimple } from 'src/components/Main/MainSectionHeroControlsSimple'
import { MainSectionHeroControlsAdvanced } from 'src/components/Main/MainSectionHeroControlsAdvanced'
import { MainToggleAdvancedControls } from 'src/components/Main/MainToggleAdvancedControls'
import { CardL1, CardL1Body } from 'src/components/Common/Card'
import type { FormDropdownOption } from 'src/components/Common/FormDropdownOption'
import FormDropdownStateless from 'src/components/Common/FormDropdownStateless'

export interface MainSectionHeroProps {
  showAdvancedControls: boolean
}

const mapStateToProps = (state: State) => ({
  showAdvancedControls: state.settings.showAdvancedControls,
})

const mapDispatchToProps = {}

export const MainSectionHero = connect(mapStateToProps, mapDispatchToProps)(MainSectionHeroDisconnected)

export function MainSectionHeroDisconnected({ showAdvancedControls }: MainSectionHeroProps) {
  const { t } = useTranslation()

  const [current, setCurrent] = useState<FormDropdownOption<string>>()

  const virusNameDefault = 'SARS-CoV-2'
  const virusNameOptionDefault = { value: virusNameDefault, label: virusNameDefault }
  const virusNameOptions = ['Flu', virusNameDefault, 'Zika'].map((name) => ({ value: name, label: name }))

  return (
    <>
      <Row noGutters>
        <Col>
          <CardL1>
            <CardL1Body>
              <Row>
                <Col md={6}>
                  <Form>
                    <FormDropdownStateless<string>
                      identifier="virus.name"
                      label={t('Virus')}
                      help={t('Select virus name')}
                      options={virusNameOptions}
                      defaultOption={virusNameOptionDefault}
                      value={current}
                      onOptionChange={setCurrent}
                    />
                  </Form>
                </Col>
                <Col md={6} className="w-100 d-flex">
                  <MainToggleAdvancedControls />
                </Col>
              </Row>
            </CardL1Body>
          </CardL1>
        </Col>
      </Row>

      {showAdvancedControls ? <MainSectionHeroControlsAdvanced /> : <MainSectionHeroControlsSimple />}
    </>
  )
}
