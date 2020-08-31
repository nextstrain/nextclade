import React, { useCallback } from 'react'

import styled from 'styled-components'
import { connect } from 'react-redux'
import { Button, ButtonProps } from 'reactstrap'
import { useTranslation } from 'react-i18next'
import { FaFilter } from 'react-icons/fa'

import { State } from 'src/state/reducer'
import { setFilterPanelCollapsed } from 'src/state/ui/ui.actions'

export const ButtonStyled = styled(Button)`
  margin: 2px 2px;
  height: 38px;
  width: 50px;
  color: ${(props) => props.theme.gray700};

  @media (min-width: 1200px) {
    width: 100px;
  }
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
    <ButtonStyled onClick={toggleFilterPanel}>
      <FaFilter className="mr-xl-2 mb-1" />
      <span className="d-none d-xl-inline">{t('Filter')}</span>
    </ButtonStyled>
  )
}
