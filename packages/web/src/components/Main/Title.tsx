import React from 'react'

import { Badge } from 'reactstrap'
import styled from 'styled-components'

import { TITLE_COLORS } from 'src/constants'

// eslint-disable-next-line prefer-destructuring
const PACKAGE_VERSION = process.env.PACKAGE_VERSION

// Borrowed with modifications from Nextstrain.org
// https://github.com/nextstrain/nextstrain.org/blob/master/static-site/src/components/splash/title.jsx

const TitleH1 = styled.h1`
  display: inline;
  margin-top: 0px;
  margin-bottom: 0px;
  font-weight: 300;
  letter-spacing: -1px;
  font-size: 106px;

  @media (max-width: 780px) {
    font-size: 82px;
  }

  @media (max-width: 560px) {
    font-size: 60px;
  }

  @media (max-width: 490px) {
    font-size: 50px;
  }
`

const VersionMaturityBadge = styled(Badge)`
  display: inline;
  position: relative;
  top: -50px;
  left: -5px;
  font-size: 1.1rem;

  @media (max-width: 780px) {
    top: -40px;
    left: -4px;
    font-size: 0.75rem;
  }

  @media (max-width: 560px) {
    top: -30px;
    left: -3px;
    font-size: 0.66rem;
  }

  @media (max-width: 490px) {
    top: -25px;
    left: -2px;
    font-size: 0.5rem;
  }
`

const VersionNumberBadge = styled.p`
  display: inline;
  position: relative;
  left: -50px;
  font-size: 0.85rem;
  color: #7b838a;

  @media (max-width: 780px) {
    left: -35px;
    font-size: 0.8rem;
  }

  @media (max-width: 560px) {
    left: -30px;
    font-size: 0.75rem;
  }

  @media (max-width: 490px) {
    left: -23px;
    font-size: 0.7rem;
  }
`

const LetterSpan = styled.span<{ pos: number }>`
  color: ${(props) => TITLE_COLORS[props.pos]};
`

export const Title = () => (
  <span>
    <TitleH1>
      {'Nextclade'.split('').map((letter, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <LetterSpan key={`${i}_${letter}`} pos={i}>
          {letter}
        </LetterSpan>
      ))}
    </TitleH1>
    <VersionMaturityBadge color="secondary">{'beta'}</VersionMaturityBadge>
    {PACKAGE_VERSION && <VersionNumberBadge color="secondary">{`v${PACKAGE_VERSION}`}</VersionNumberBadge>}
  </span>
)

export const Subtitle = styled.h1`
  font-weight: 300;
  font-size: 30px;
  color: #555;

  @media (max-width: 780px) {
    font-size: 25px;
  }

  @media (max-width: 560px) {
    font-size: 22px;
  }
`
