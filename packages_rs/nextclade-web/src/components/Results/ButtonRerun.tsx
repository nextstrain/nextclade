import React, { useCallback, useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { canRunAtom } from 'src/state/results.state'
import styled from 'styled-components'
import { MdRefresh } from 'react-icons/md'

import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { PanelButton } from 'src/components/Results/PanelButton'

export const RefreshIcon = styled(MdRefresh)`
  width: 22px;
  height: 22px;
  margin-bottom: 3px;
`

export function ButtonRerun() {
  const { t } = useTranslationSafe()
  const tooltip = useMemo(() => t('Run the algorithm again'), [t])
  const rerun = useCallback(() => {
    // TODO
  }, [])
  const canRun = useRecoilValue(canRunAtom)

  return (
    <PanelButton onClick={rerun} disabled={!canRun} title={tooltip}>
      <RefreshIcon />
    </PanelButton>
  )
}
