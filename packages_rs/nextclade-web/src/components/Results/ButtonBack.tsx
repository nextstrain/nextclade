import React from 'react'

import { connect } from 'react-redux'
import { Button, ButtonProps } from 'reactstrap'
import { useTranslation } from 'react-i18next'
import { push } from 'connected-next-router'
import { FaCaretLeft } from 'react-icons/fa'

import { State } from 'src/state/reducer'
import styled from 'styled-components'

export const ButtonStyled = styled(Button)`
  margin: 2px 2px;
  height: 38px;
  width: 50px;
  color: ${(props) => props.theme.gray700};

  @media (min-width: 1200px) {
    width: 140px;
  }
`

const mapStateToProps = (state: State) => ({})

const mapDispatchToProps = {
  goBack: () => push('/'),
}

export const ButtonBack = connect(mapStateToProps, mapDispatchToProps)(ButtonBackDisconnected)

export interface ButtonBackProps extends ButtonProps {
  goBack(): void
}

export function ButtonBackDisconnected({ onClick, goBack }: ButtonBackProps) {
  const { t } = useTranslation()
  const text = t('Back')

  return (
    <ButtonStyled color="secondary" onClick={goBack} title={text}>
      <FaCaretLeft />
      <span className="d-none d-xl-inline">{text}</span>
    </ButtonStyled>
  )
}
