import React from 'react'

import { connect } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { setShowAdvancedControls } from 'src/state/settings/settings.actions'
import styled from 'styled-components'

import { ToggleTwoLabels } from 'src/components/Common/ToggleTwoLabels'
import { State } from 'src/state/reducer'

const AdvancedToggleWrapper = styled.div`
  padding: 10px 15px;
  margin: 10px 7px;
  border: #cccccc solid 1px;
  border-radius: 3px;
`

export interface MainToggleAdvancedControlsProps {
  showAdvancedControls: boolean

  setShowAdvancedControls(showAdvanced: boolean): void
}

const mapStateToProps = (state: State) => ({
  showAdvancedControls: state.settings.showAdvancedControls,
})

const mapDispatchToProps = {
  setShowAdvancedControls,
}

export const MainToggleAdvancedControls = connect(
  mapStateToProps,
  mapDispatchToProps,
)(MainToggleAdvancedControlsDisconnected)

export function MainToggleAdvancedControlsDisconnected({
  showAdvancedControls,
  setShowAdvancedControls,
}: MainToggleAdvancedControlsProps) {
  const { t } = useTranslation()

  return (
    <AdvancedToggleWrapper className="ml-auto">
      <ToggleTwoLabels
        identifier={'toggle-advanced-controls'}
        checked={showAdvancedControls}
        onCheckedChanged={setShowAdvancedControls}
        labelRight={t('Simple mode')}
        labelLeft={t('Advanced mode')}
      />
    </AdvancedToggleWrapper>
  )
}
