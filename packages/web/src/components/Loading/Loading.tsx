import React from 'react'

import { useTranslation } from 'react-i18next'

import { ReactComponent as LogoNextstrain } from 'src/assets/img/nextstrain_logo.svg'
import styled from 'styled-components'

const Container = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
`

const SpinningLogo = styled(LogoNextstrain)`
  margin: auto;
  width: 80px;
  height: 80px;
  animation: spin 1s linear infinite;
  @keyframes spin {
    100% {
      transform: rotate(360deg);
    }
  }
`

function Loading() {
  const { t } = useTranslation()
  return (
    <Container title={t('Loading...')}>
      <SpinningLogo />
    </Container>
  )
}

export default Loading
