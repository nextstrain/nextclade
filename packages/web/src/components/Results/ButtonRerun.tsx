import React, { useCallback } from 'react'

import styled from 'styled-components'
import { connect } from 'react-redux'
import { Button, ButtonProps } from 'reactstrap'
import { useTranslation } from 'react-i18next'

import type { State } from 'src/state/reducer'
import { AlgorithmGlobalStatus } from 'src/state/algorithm/algorithm.state'
import { algorithmRunAsync } from 'src/state/algorithm/algorithm.actions'
import { MdRefresh } from 'react-icons/md'

export const ButtonStyled = styled(Button)<ButtonProps>`
  margin: 2px 2px;
  height: 38px;
  width: 75px;
  color: ${(props) => props.theme.gray100};

  @media (min-width: 1200px) {
    width: 120px;
  }
`
export const Refresh = styled(MdRefresh)`
  width: 22px;
  height: 22px;
  margin-bottom: 3px;

  @media (min-width: 1200px) {
    margin-right: 2px;
  }
`

const mapStateToProps = (state: State) => ({
  canRun:
    state.algorithm.status === AlgorithmGlobalStatus.allDone || state.algorithm.status === AlgorithmGlobalStatus.idling,
})

const mapDispatchToProps = {
  algorithmRunTrigger: algorithmRunAsync.trigger,
}

export const ButtonRerun = connect(mapStateToProps, mapDispatchToProps)(ButtonRerunDisconnected)

export interface ButtonRerunProps extends ButtonProps {
  canRun: boolean

  algorithmRunTrigger(_0: void): void
}

export function ButtonRerunDisconnected({ algorithmRunTrigger, canRun }: ButtonRerunProps) {
  const { t } = useTranslation()
  const rerun = useCallback(() => algorithmRunTrigger(), [algorithmRunTrigger])

  const text = t('Rerun')
  const tooltip = t('Run the algorithm again')

  return (
    <ButtonStyled color="success" onClick={rerun} disabled={!canRun} title={tooltip}>
      <Refresh />
      <span className="d-none d-xl-inline">{text}</span>
    </ButtonStyled>
  )
}
