import React, { useCallback } from 'react'

import styled from 'styled-components'
import { connect } from 'react-redux'
import { Button, ButtonProps } from 'reactstrap'
import { useTranslation } from 'react-i18next'
import { FaFilter } from 'react-icons/fa'

import { State } from 'src/state/reducer'
import { setFilterPanelCollapsed } from 'src/state/ui/ui.actions'

export const ButtonStyled = styled(Button)`
  width: 100px;
  margin: 0 5px;
`

const mapStateToProps = (state: State) => ({
  filterPanelCollapsed: state.ui.filterPanelCollapsed,
})

const mapDispatchToProps = {
  setFilterPanelCollapsed,
}

export const ButtonFilter = connect(mapStateToProps, mapDispatchToProps)(ButtonFilterDisconnected)

export interface ButtonFilterProps extends ButtonProps {
  filterPanelCollapsed: boolean
  setFilterPanelCollapsed(filterPanelCollapsed: boolean): void
}

export function ButtonFilterDisconnected({
  onClick,
  goBack,
  filterPanelCollapsed,
  setFilterPanelCollapsed,
}: ButtonFilterProps) {
  const { t } = useTranslation()
  const toggleFilterPanel = useCallback(() => setFilterPanelCollapsed(!filterPanelCollapsed), [
    filterPanelCollapsed,
    setFilterPanelCollapsed,
  ])

  return (
    <ButtonStyled color="secondary" onClick={toggleFilterPanel}>
      <FaFilter className="mr-2" />
      {t('Filter')}
    </ButtonStyled>
  )
}
