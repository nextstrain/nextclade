import React, { useCallback } from 'react'

import styled from 'styled-components'
import { connect } from 'react-redux'
import { Button, ButtonProps } from 'reactstrap'
import { useTranslation } from 'react-i18next'

import { State } from 'src/state/reducer'
import { AlgorithmGlobalStatus } from 'src/state/algorithm/algorithm.state'
import { MdRefresh } from 'react-icons/md'
import { algorithmRunTrigger, algorithmStopTrigger } from 'src/state/algorithm/algorithm.actions'

export const ButtonStyled = styled(Button)<ButtonProps>`
  width: 150px;
  margin: 0 5px;
`

export function ButtonRun({ onClick, disabled }: ButtonProps) {
  const { t } = useTranslation()

  const text = t('Rerun')
  const tooltip = t('Run the algorithm again')

  return (
    <ButtonStyled color="success" onClick={onClick} disabled={disabled} title={tooltip}>
      <MdRefresh className="btn-icon" />
      <span>{text}</span>
    </ButtonStyled>
  )
}

export function ButtonStop({ onClick, disabled }: ButtonProps) {
  const { t } = useTranslation()

  const text = t('Stop')
  const tooltip = t('Interrupt the current algorithm run')

  return (
    <ButtonStyled color="danger" onClick={onClick} disabled={disabled} title={tooltip}>
      <MdRefresh className="btn-icon" />
      <span>{text}</span>
    </ButtonStyled>
  )
}

const mapStateToProps = (state: State) => ({
  isRunning:
    state.algorithm.status !== AlgorithmGlobalStatus.idling && state.algorithm.status !== AlgorithmGlobalStatus.allDone,
  canRun:
    state.algorithm.status === AlgorithmGlobalStatus.allDone || state.algorithm.status === AlgorithmGlobalStatus.idling,
})

const mapDispatchToProps = {
  algorithmRunTrigger: (content?: string | File) => algorithmRunTrigger(content),
  algorithmStopTrigger: (_0: void) => algorithmStopTrigger(),
}

export const ButtonRunStop = connect(mapStateToProps, mapDispatchToProps)(ButtonRunStopDisconnected)

export interface ButtonRunStopProps extends ButtonProps {
  isRunning: boolean
  canRun: boolean
  algorithmStopTrigger: (_0: void) => void
  algorithmRunTrigger(content?: string | File): void
}

export function ButtonRunStopDisconnected({
  algorithmRunTrigger,
  algorithmStopTrigger,
  isRunning,
  canRun,
}: ButtonRunStopProps) {
  const run = useCallback(() => algorithmRunTrigger(), [algorithmRunTrigger])
  const stop = useCallback(() => algorithmStopTrigger(), [algorithmStopTrigger])

  const btnRun = <ButtonRun onClick={run} disabled={!canRun} />
  const btnStop = <ButtonStop onClick={stop} disabled={!isRunning} />

  return isRunning ? btnStop : btnRun
}
