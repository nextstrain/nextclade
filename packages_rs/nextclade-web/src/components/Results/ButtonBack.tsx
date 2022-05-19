import React, { useMemo } from 'react'
import { useRouter } from 'next/router'
import { Button } from 'reactstrap'
import styled from 'styled-components'
import { FaCaretLeft } from 'react-icons/fa'

import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

export const ButtonStyled = styled(Button)`
  margin: 2px 2px;
  height: 38px;
  width: 50px;
  color: ${(props) => props.theme.gray700};

  @media (min-width: 1200px) {
    width: 140px;
  }
`

export function ButtonBack() {
  const { t } = useTranslationSafe()
  const text = useMemo(() => t('Back'), [t])
  const { back } = useRouter()

  return (
    <ButtonStyled color="secondary" onClick={back} title={text}>
      <FaCaretLeft />
      <span className="d-none d-xl-inline">{text}</span>
    </ButtonStyled>
  )
}
