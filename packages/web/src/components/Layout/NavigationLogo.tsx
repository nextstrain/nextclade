import React from 'react'
import styled from 'styled-components'

import { TITLE_COLORS } from 'src/constants'
import { Badge } from 'reactstrap'

// Borrowed with modifications from Nextstrain.org
// https://github.com/nextstrain/nextstrain.org/blob/master/static-site/src/components/splash/title.jsx

const LetterSpan = styled.span<{ pos: number }>`
  font-size: 20px;
  color: ${(props) => TITLE_COLORS[props.pos]};
`

const VersionBadge = styled(Badge)`
  position: relative;
  top: -12px;
  left: -2px;
  font-size: 0.5rem;
`

export const NavigationLogo = () => (
  <div>
    {'Nextclade'.split('').map((letter, i) => (
      // eslint-disable-next-line react/no-array-index-key
      <LetterSpan key={`${i}_${letter}`} pos={i}>
        {letter}
      </LetterSpan>
    ))}
    <VersionBadge color="secondary">{'beta'}</VersionBadge>
  </div>
)
