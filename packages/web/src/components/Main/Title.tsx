import React from 'react'
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
  </TitleH1>
)
