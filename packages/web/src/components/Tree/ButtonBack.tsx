import React from 'react'

import { connect } from 'react-redux'
import { Button, ButtonProps } from 'reactstrap'
import { useTranslation } from 'react-i18next'
import { push } from 'connected-next-router'
import { FaCaretLeft } from 'react-icons/fa'

import { State } from 'src/state/reducer'
import styled from 'styled-components'

export const ButtonStyled = styled(Button)`
  width: 140px;

  margin: 0;
`

const mapStateToProps = (state: State) => ({})

const mapDispatchToProps = {
  goBack: () => push('/results'),
}

export const ButtonBack = connect(mapStateToProps, mapDispatchToProps)(ButtonBackDisconnected)

export interface ButtonBackProps extends ButtonProps {
  goBack(): void
}

export function ButtonBackDisconnected({ onClick, goBack }: ButtonBackProps) {
  const { t } = useTranslation()

  return (
    <ButtonStyled color="secondary" onClick={goBack}>
      <FaCaretLeft />
      {t('Back')}
    </ButtonStyled>
  )
}
