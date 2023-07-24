import React from 'react'

import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'

import BrandLogoBase from 'src/assets/img/nextclade_logo.svg'
import styled from 'styled-components'

const LOADING_LOGO_SIZE = 150
const LOADING_SPINNER_THICKNESS = 17

const Container = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;

  transform: scale(1);
  animation: breathe 4s ease-out infinite;
  @keyframes breathe {
    0% {
      transform: scale(0.85);
    }
    50% {
      transform: scale(1);
    }
    100% {
      transform: scale(0.85);
    }
  }
`

const BrandLogo = styled(BrandLogoBase)`
  margin: auto;
  width: ${LOADING_LOGO_SIZE}px;
  height: ${LOADING_LOGO_SIZE}px;
  box-shadow: 0 0 0 0 rgba(0, 0, 0, 1);
`

const SpinnerAnimation = styled.div`
  margin: auto;
  display: flex;
  width: ${LOADING_LOGO_SIZE + LOADING_SPINNER_THICKNESS}px;
  height: ${LOADING_LOGO_SIZE + LOADING_SPINNER_THICKNESS}px;
  overflow: hidden;

  border-radius: 10px;

  --c1: linear-gradient(90deg, #0000 calc(100% / 3), var(--c0) 0 calc(2 * 100% / 3), #0000 0);
  --c2: linear-gradient(0deg, #0000 calc(100% / 3), var(--c0) 0 calc(2 * 100% / 3), #0000 0);
  background: var(--c1), var(--c2), var(--c1), var(--c2);
  background-size: 300% 20px, 20px 300%;
  background-repeat: no-repeat;

  animation: snake 1.25s infinite linear;
  @keyframes snake {
    0% {
      background-position: 50% 0, 100% 100%, 0 100%, 0 0;
      --c0: #268dce;
    }
    25% {
      background-position: 0 0, 100% 50%, 0 100%, 0 0;
      --c0: #ad8f2a;
    }
    37% {
      --c0: #d63b3b;
    }
    50% {
      background-position: 0 0, 100% 0, 50% 100%, 0 0;
      --c0: #df8215;
    }
    75% {
      background-position: 0 0, 100% 0, 100% 100%, 0 50%;
      --c0: #aab44b;
    }
    75.01% {
      background-position: 100% 0, 100% 0, 100% 100%, 0 50%;
      --c0: #48b6bd;
    }
    100% {
      background-position: 50% 0, 100% 0, 100% 100%, 0 100%;
      --c0: #1598c8;
    }
  }
`

function Loading() {
  const { t } = useTranslation()
  return (
    <Container title={t('Loading...')}>
      <SpinnerAnimation>
        <BrandLogo />
      </SpinnerAnimation>
    </Container>
  )
}

export default Loading
