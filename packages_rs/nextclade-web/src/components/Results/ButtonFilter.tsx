import React, { useCallback } from 'react'
import { FaFilter } from 'react-icons/fa'
import { useSetRecoilState } from 'recoil'

import { PanelButton } from 'src/components/Results/PanelButton'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { isResultsFilterPanelCollapsedAtom } from 'src/state/settings.state'

export function ButtonFilter() {
  const { t } = useTranslationSafe()

  const setIsResultsFilterPanelCollapsed = useSetRecoilState(isResultsFilterPanelCollapsedAtom)

  const toggleFilterPanel = useCallback(
    () => setIsResultsFilterPanelCollapsed((filterPanelCollapsed) => !filterPanelCollapsed),
    [setIsResultsFilterPanelCollapsed],
  )

  return (
    <PanelButton onClick={toggleFilterPanel} title={t('Filter: opens panel where you can apply table row filtering')}>
      <FaFilter size={15} />
    </PanelButton>
  )
}
