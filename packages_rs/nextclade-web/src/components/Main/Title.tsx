import React from 'react'

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
  font-size: 6rem;

  @media (max-width: 767.98px) {
    font-size: 5rem;
  }

  @media (max-width: 576px) {
    font-size: 3.5rem;
  }
`

const VersionNumberBadge = styled.p`
  display: inline;
  font-size: 0.85rem;
  color: #7b838a;

  @media (max-width: 767.98px) {
    left: -35px;
    font-size: 0.8rem;
  }

  @media (max-width: 576px) {
    left: -30px;
    font-size: 0.75rem;
  }
`

const LetterSpan = styled.span<{ pos: number }>`
  color: ${(props) => TITLE_COLORS[props.pos]};
`

export function Title() {
  return (
    <span>
      <TitleH1>
        {'Nextclade'.split('').map((letter, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <LetterSpan key={`${i}_${letter}`} pos={i}>
            {letter}
          </LetterSpan>
        ))}
      </TitleH1>
      {PACKAGE_VERSION && <VersionNumberBadge color="secondary">{`v${PACKAGE_VERSION}`}</VersionNumberBadge>}
    </span>
  )
}

export const Subtitle = styled.p`
  text-align: center;
  font-size: 2rem;
  font-weight: 300;
  margin-bottom: 0;

  @media (max-width: 991.98px) {
    font-size: 1.5rem;
  }

  @media (max-width: 767.98px) {
    font-size: 1.2rem;
  }

  @media (max-width: 576px) {
    font-size: 1rem;
  }
`
