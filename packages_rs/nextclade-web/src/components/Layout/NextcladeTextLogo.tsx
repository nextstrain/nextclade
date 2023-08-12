import React from 'react'
import styled from 'styled-components'

import { TITLE_COLORS } from 'src/constants'

const Container = styled.div`
  margin: auto;
`

// Borrowed with modifications from Nextstrain.org
// https://github.com/nextstrain/nextstrain.org/blob/master/static-site/src/components/splash/title.jsx
const LetterSpan = styled.span<{ pos: number }>`
  font-size: 20px;
  color: ${(props) => TITLE_COLORS[props.pos]};
`

export function NextcladeTextLogo() {
  return (
    <Container>
      {'Nextclade'.split('').map((letter, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <LetterSpan key={`${i}_${letter}`} pos={i}>
          {letter}
        </LetterSpan>
      ))}
    </Container>
  )
}
