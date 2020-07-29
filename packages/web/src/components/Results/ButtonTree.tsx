import React, { memo } from 'react'

import styled from 'styled-components'
import { connect } from 'react-redux'
import { Button, ButtonProps } from 'reactstrap'
import { useTranslation } from 'react-i18next'

import { RectangularTree } from 'auspice/src/components/framework/svg-icons'

import { State } from 'src/state/reducer'
import { showTree } from 'src/state/auspice/auspice.actions'
import { AlgorithmStatus } from 'src/state/algorithm/algorithm.state'

const IconContainer = styled.span`
  margin-right: 0.5rem;
`

export function TreeIconRaw() {
  const size = 20
  const theme = { unselectedColor: '#000' }
  return <RectangularTree theme={theme} width={size} />
}

const TreeIcon = memo(TreeIconRaw)

export const ButtonStyled = styled(Button)<ButtonProps>`
  width: 100px;
  margin: 0 5px;
`

const mapStateToProps = (state: State) => ({
  hasResults: state.algorithm.status === AlgorithmStatus.done,
})

const mapDispatchToProps = {
  showTree,
}

export const ButtonTree = connect(mapStateToProps, mapDispatchToProps)(ButtonTreeDisconnected)

export interface ButtonTreeProps extends ButtonProps {
  showTree(_0: void): void
}

export function ButtonTreeDisconnected({ showTree, hasResults }: ButtonTreeProps) {
  const { t } = useTranslation()

  return (
    <ButtonStyled color="secondary" onClick={showTree} disabled={!hasResults}>
      <IconContainer>
        <TreeIcon />
      </IconContainer>
      {t('Tree')}
    </ButtonStyled>
  )
}
