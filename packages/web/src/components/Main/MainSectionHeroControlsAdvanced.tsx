import React from 'react'

import { connect } from 'react-redux'

import { useTranslation } from 'react-i18next'
import { Col, Row } from 'reactstrap'

import type { AlgorithmParams } from 'src/algorithms/types'
import type { State } from 'src/state/reducer'
import { setIsDirty } from 'src/state/algorithm/algorithm.actions'
import { selectCanExport, selectIsDirty, selectParams } from 'src/state/algorithm/algorithm.selectors'

export interface MainSectionHeroControlsAdvancedProps {
  params: AlgorithmParams
  isDirty: boolean

  setIsDirty(isDirty: boolean): void
}

const mapStateToProps = (state: State) => ({
  params: selectParams(state),
  canExport: selectCanExport(state),
  isDirty: selectIsDirty(state),
  showInputBox: state.ui.showInputBox,
})

const mapDispatchToProps = {
  setIsDirty,
}

export const MainSectionHeroControlsAdvanced = connect(
  mapStateToProps,
  mapDispatchToProps,
)(MainSectionHeroControlsAdvancedDisconnected)

export function MainSectionHeroControlsAdvancedDisconnected({
  params,
  isDirty,
  setIsDirty,
}: MainSectionHeroControlsAdvancedProps) {
  const { t } = useTranslation()

  return (
    <Row noGutters className="hero-content">
      <Col className="px-lg-4">
        <div className="hero-content-left-card"></div>
      </Col>
    </Row>
  )
}
