import React, { useCallback } from 'react'

import { connect } from 'react-redux'
import { FaFilter } from 'react-icons/fa'

import type { State } from 'src/state/reducer'
import type { PanelButtonProps } from 'src/components/Results/PanelButton'
import { PanelButton } from 'src/components/Results/PanelButton'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { setFilterPanelCollapsed } from 'src/state/ui/ui.actions'

const mapStateToProps = (state: State) => ({
  filterPanelCollapsed: state.ui.filterPanelCollapsed,
})

const mapDispatchToProps = {
  setFilterPanelCollapsed,
}

export const ButtonFilter = connect(mapStateToProps, mapDispatchToProps)(ButtonFilterDisconnected)

export interface ButtonFilterProps extends PanelButtonProps {
  filterPanelCollapsed: boolean
  setFilterPanelCollapsed(filterPanelCollapsed: boolean): void
}

export function ButtonFilterDisconnected({ filterPanelCollapsed, setFilterPanelCollapsed }: ButtonFilterProps) {
  const { t } = useTranslationSafe()
  const toggleFilterPanel = useCallback(() => setFilterPanelCollapsed(!filterPanelCollapsed), [
    filterPanelCollapsed,
    setFilterPanelCollapsed,
  ])

  return (
    <PanelButton onClick={toggleFilterPanel} title={t('Filter: opens panel where you can apply table row filtering')}>
      <FaFilter size={15} />
    </PanelButton>
  )
}
