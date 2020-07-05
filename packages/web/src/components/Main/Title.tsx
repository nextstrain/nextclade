import React from 'react'

import { Badge } from 'reactstrap'
import styled from 'styled-components'

import { TITLE_COLORS } from 'src/constants'

// Borrowed with modifications from Nextstrain.org
// https://github.com/nextstrain/nextstrain.org/blob/master/static-site/src/components/splash/title.jsx

const TitleH1 = styled.h1`
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

const VersionBadge = styled(Badge)`
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

const LetterSpan = styled.span<{ pos: number }>`
  color: ${(props) => TITLE_COLORS[props.pos]};
`

export const Title = () => (
  <TitleH1>
    {'Nextclade'.split('').map((letter, i) => (
      // eslint-disable-next-line react/no-array-index-key
      <LetterSpan key={`${i}_${letter}`} pos={i}>
        {letter}
      </LetterSpan>
    ))}
    <VersionBadge color="secondary">{'beta'}</VersionBadge>
  </TitleH1>
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
