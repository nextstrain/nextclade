import React, { useCallback } from 'react'
import { FaFilter } from 'react-icons/fa'
import { useSetRecoilState } from 'recoil'
import type { ButtonProps } from 'reactstrap'
import { Button } from 'reactstrap'
import styled from 'styled-components'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { isResultsFilterPanelCollapsedAtom } from 'src/state/settings.state'

export function ButtonFilter({ ...rest }: ButtonProps) {
  const { t } = useTranslationSafe()

  const setIsResultsFilterPanelCollapsed = useSetRecoilState(isResultsFilterPanelCollapsedAtom)

  const toggleFilterPanel = useCallback(
    () => setIsResultsFilterPanelCollapsed((filterPanelCollapsed) => !filterPanelCollapsed),
    [setIsResultsFilterPanelCollapsed],
  )

  return (
    <PanelButton
      color="secondary"
      onClick={toggleFilterPanel}
      title={t('Filter: opens panel where you can apply table row filtering')}
      {...rest}
    >
      <FaFilter size={12} />
    </PanelButton>
  )
}

export const PanelButton = styled(Button)`
  height: 36px;
  width: 36px;
  color: ${(props) => props.theme.gray600};
`
