import React, { useCallback } from 'react'

import styled from 'styled-components'
import { connect } from 'react-redux'
import { Button, ButtonProps } from 'reactstrap'
import { useTranslation } from 'react-i18next'
import { FaFilter } from 'react-icons/fa'

import { State } from 'src/state/reducer'
import { setTreeFilterPanelCollapsed } from 'src/state/ui/ui.actions'

export const ButtonStyled = styled(Button)`
  width: 150px;
  margin: 0 5px;
`

const mapStateToProps = (state: State) => ({
  treeFilterPanelCollapsed: state.ui.treeFilterPanelCollapsed,
})

const mapDispatchToProps = {
  setTreeFilterPanelCollapsed,
}

export const ButtonTreeFilter = connect(mapStateToProps, mapDispatchToProps)(ButtonFilterDisconnected)

export interface ButtonFilterProps extends ButtonProps {
  treeFilterPanelCollapsed: boolean
  setTreeFilterPanelCollapsed(treeFilterPanelCollapsed: boolean): void
}

export function ButtonFilterDisconnected({
  onClick,
  goBack,
  treeFilterPanelCollapsed,
  setTreeFilterPanelCollapsed,
}: ButtonFilterProps) {
  const { t } = useTranslation()
  const toggleFilterPanel = useCallback(() => setTreeFilterPanelCollapsed(!treeFilterPanelCollapsed), [
    treeFilterPanelCollapsed,
    setTreeFilterPanelCollapsed,
  ])

  return (
    <ButtonStyled color="secondary" onClick={toggleFilterPanel}>
      <FaFilter className="mr-2" />
      {t('Filter tree')}
    </ButtonStyled>
  )
}
