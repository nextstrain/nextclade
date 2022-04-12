import React, { useCallback } from 'react'

import styled from 'styled-components'
import { connect } from 'react-redux'

import { useTranslation } from 'react-i18next'

import type { State } from 'src/state/reducer'
import type { AlgorithmInput } from 'src/state/algorithm/algorithm.state'
import type { PanelButtonProps } from 'src/components/Results/PanelButton'
import { PanelButton } from 'src/components/Results/PanelButton'
import { algorithmRunAsync } from 'src/state/algorithm/algorithm.actions'
import { MdRefresh } from 'react-icons/md'
import { selectCanRun } from 'src/state/algorithm/algorithm.selectors'

export const RefreshIcon = styled(MdRefresh)`
  width: 22px;
  height: 22px;
  margin-bottom: 3px;
`

const mapStateToProps = (state: State) => ({
  canRun: selectCanRun(state),
})

const mapDispatchToProps = {
  algorithmRunTrigger: algorithmRunAsync.trigger,
}

export const ButtonRerun = connect(mapStateToProps, mapDispatchToProps)(ButtonRerunDisconnected)

export interface ButtonRerunProps extends PanelButtonProps {
  canRun: boolean

  algorithmRunTrigger(input?: AlgorithmInput): void
}

export function ButtonRerunDisconnected({ algorithmRunTrigger, canRun }: ButtonRerunProps) {
  const { t } = useTranslation()
  const rerun = useCallback(() => algorithmRunTrigger(), [algorithmRunTrigger])
  const tooltip = t('Run the algorithm again')

  return (
    <PanelButton onClick={rerun} disabled={!canRun} title={tooltip}>
      <RefreshIcon />
    </PanelButton>
  )
}
