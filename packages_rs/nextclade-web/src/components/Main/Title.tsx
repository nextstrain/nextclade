import React from 'react'
import { device } from 'src/theme'

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
  font-size: 5rem;

  @media ${device.desktopL} {
    font-size: 4.5rem;
  }

  @media ${device.desktop} {
    font-size: 3.75rem;
  }

  @media ${device.laptopL} {
    font-size: 3.5rem;
  }

  @media ${device.laptop} {
    font-size: 3.25rem;
  }

  @media ${device.tablet} {
    font-size: 3rem;
  }

  @media ${device.mobile} {
    font-size: 2.75rem;
  }
`

const VersionNumberBadge = styled.p`
  display: inline;
  font-size: 0.85rem;
  color: #7b838a;
  left: -35px;

  @media ${device.desktop} {
    font-size: 0.8rem;
  }

  @media ${device.laptop} {
    font-size: 0.7rem;
  }

  @media ${device.tablet} {
    font-size: 0.6rem;
  }

  @media ${device.mobile} {
    font-size: 0.5rem;
  }
`

const LetterSpan = styled.span<{ pos: number }>`
  color: ${(props) => TITLE_COLORS[props.pos]};
`

export function Title() {
  return (
    <span className="mx-auto">
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

  @media ${device.desktopL} {
    font-size: 1.5rem;
  }

  @media ${device.desktop} {
    font-size: 1.33rem;
  }

  @media ${device.laptopL} {
    font-size: 1.25rem;
  }

  @media ${device.laptop} {
    font-size: 1.2rem;
  }

  @media ${device.tablet} {
    font-size: 1.1rem;
  }

  @media ${device.mobile} {
    font-size: 1rem;
  }
`
