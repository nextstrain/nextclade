import React, { useCallback } from 'react'

import styled from 'styled-components'
import { connect } from 'react-redux'
import { Button, ButtonProps } from 'reactstrap'
import { useTranslation } from 'react-i18next'

import { State } from 'src/state/reducer'
import { AlgorithmGlobalStatus } from 'src/state/algorithm/algorithm.state'
import { MdRefresh } from 'react-icons/md'
import { algorithmRunTrigger } from 'src/state/algorithm/algorithm.actions'

export const ButtonStyled = styled(Button)<ButtonProps>`
  width: 150px;
  margin: 0 3px;
`

const mapStateToProps = (state: State) => ({
  canRun:
    state.algorithm.status === AlgorithmGlobalStatus.allDone || state.algorithm.status === AlgorithmGlobalStatus.idling,
})

const mapDispatchToProps = {
  algorithmRunTrigger: (content?: string | File) => algorithmRunTrigger(content),
}

export const ButtonRerun = connect(mapStateToProps, mapDispatchToProps)(ButtonRerunDisconnected)

export interface ButtonRerunProps extends ButtonProps {
  canRun: boolean
  algorithmRunTrigger(content?: string | File): void
}

export function ButtonRerunDisconnected({ algorithmRunTrigger, canRun }: ButtonRerunProps) {
  const { t } = useTranslation()
  const rerun = useCallback(() => algorithmRunTrigger(), [algorithmRunTrigger])

  const text = t('Rerun')
  const tooltip = t('Run the algorithm again')

  return (
    <ButtonStyled color="success" onClick={rerun} disabled={!canRun} title={tooltip}>
      <MdRefresh className="btn-icon" />
      <span>{text}</span>
    </ButtonStyled>
  )
}
