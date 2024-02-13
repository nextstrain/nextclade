import React, { HTMLProps } from 'react'
import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'
import BrandLogoBase from 'src/assets/img/nextclade_logo.svg'
import styled from 'styled-components'
import { StrictOmit } from 'ts-essentials'

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

const BrandLogo = styled(BrandLogoBase)<{ $size: number }>`
  margin: auto;
  width: ${(props) => props.$size}px;
  height: ${(props) => props.$size}px;
  box-shadow: 0 0 0 0 rgba(0, 0, 0, 1);
`

const SpinnerAnimation = styled.div<{ $size: number }>`
  margin: auto;
  display: flex;
  width: ${(props) => props.$size * 1.2}px;
  height: ${(props) => props.$size * 1.2}px;
  overflow: hidden;

  border-radius: ${(props) => props.$size * 0.15}px;

  --c1: linear-gradient(90deg, #0000 calc(100% / 3), var(--c0) 0 calc(2 * 100% / 3), #0000 0);
  --c2: linear-gradient(0deg, #0000 calc(100% / 3), var(--c0) 0 calc(2 * 100% / 3), #0000 0);
  background: var(--c1), var(--c2), var(--c1), var(--c2);
  background-size: 300% ${(props) => props.$size * 0.2}px, ${(props) => props.$size * 0.2}px 300%;
  background-repeat: no-repeat;

  animation: snake 1s infinite linear;
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

export interface LoadingProps extends StrictOmit<HTMLProps<HTMLDivElement>, 'children' | 'ref' | 'as'> {
  size: number
}

export function LoadingSpinner({ size, ...rest }: LoadingProps) {
  return (
    <SpinnerAnimation $size={size} {...rest}>
      <BrandLogo $size={size} />
    </SpinnerAnimation>
  )
}

function LoadingComponent({ size, ...rest }: LoadingProps) {
  const { t } = useTranslation()
  return (
    <Container title={t('Loading...')} {...rest}>
      <LoadingSpinner size={size} />
    </Container>
  )
}

export const LOADING = <LoadingComponent size={150} />
