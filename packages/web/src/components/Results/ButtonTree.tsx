import React from 'react'

import styled, { withTheme } from 'styled-components'
import { connect } from 'react-redux'
import { Button, ButtonProps } from 'reactstrap'
import { useTranslation } from 'react-i18next'

import { RectangularTree } from 'auspice/src/components/framework/svg-icons.js'

import { State } from 'src/state/reducer'
import { showTree } from 'src/state/auspice/auspice.actions'

const IconContainer = styled.span`
  margin-right: 0.5rem;
`

const TreeIcon = withTheme(RectangularTree)

export const ButtonStyled = styled(Button)`
  width: 100px;
  margin: 0 5px;
`

const mapStateToProps = (state: State) => ({})

const mapDispatchToProps = {
  showTree,
}

export const ButtonTree = connect(mapStateToProps, mapDispatchToProps)(ButtonTreeDisconnected)

export interface ButtonTreeProps extends ButtonProps {
  showTree(_0: void): void
}

export function ButtonTreeDisconnected({ showTree }: ButtonTreeProps) {
  const { t } = useTranslation()

  return (
    <ButtonStyled color="secondary" onClick={showTree}>
      <IconContainer>
        <TreeIcon width={10} height={10} />
      </IconContainer>
      {t('Tree')}
    </ButtonStyled>
  )
}
