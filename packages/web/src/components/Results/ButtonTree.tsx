import React, { memo } from 'react'

import styled from 'styled-components'
import { connect } from 'react-redux'
import { Button, ButtonProps } from 'reactstrap'
import { useTranslation } from 'react-i18next'
import { push } from 'connected-next-router'

import { RectangularTree } from 'auspice/src/components/framework/svg-icons'

import { State } from 'src/state/reducer'
import { AlgorithmGlobalStatus } from 'src/state/algorithm/algorithm.state'

const IconContainer = styled.span`
  margin-right: 0.5rem;
`

export function TreeIconRaw() {
  const size = 20
  const theme = { unselectedColor: '#222' }
  return <RectangularTree theme={theme} width={size} />
}

const TreeIcon = memo(TreeIconRaw)

export const ButtonStyled = styled(Button)<ButtonProps>`
  margin: 2px 2px;
  height: 38px;
  width: 50px;
  color: ${(props) => props.theme.gray700};

  @media (min-width: 1200px) {
    width: 150px;
  }
`

const mapStateToProps = (state: State) => ({
  hasTree: state.algorithm.status === AlgorithmGlobalStatus.allDone,
})

const mapDispatchToProps = {
  showTree: () => push('/tree'),
}

export const ButtonTree = connect(mapStateToProps, mapDispatchToProps)(ButtonTreeDisconnected)

export interface ButtonTreeProps extends ButtonProps {
  hasTree: boolean
  showTree(_0: void): void
}

export function ButtonTreeDisconnected({ showTree, hasTree }: ButtonTreeProps) {
  const { t } = useTranslation()
  const text = t('Show Tree')

  return (
    <ButtonStyled onClick={showTree} disabled={!hasTree} title={text}>
      <IconContainer>
        <TreeIcon />
      </IconContainer>
      <span className="d-none d-xl-inline">{text}</span>
    </ButtonStyled>
  )
}
