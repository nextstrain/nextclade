import React from 'react'
import { LinkSmart } from 'src/components/Link/LinkSmart'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

import styled from 'styled-components'

import { TITLE_COLORS } from 'src/constants'

// eslint-disable-next-line prefer-destructuring
const PACKAGE_VERSION = process.env.PACKAGE_VERSION

// Borrowed with modifications from Nextstrain.org
// https://github.com/nextstrain/nextstrain.org/blob/master/static-site/src/components/splash/title.jsx

const TitleH1 = styled.h1`
  display: inline;
  margin-top: 0;
  margin-bottom: 0;
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
  const { t } = useTranslationSafe()
  return (
    <span className="d-inline-flex">
      <TitleH1>
        {'Nextclade'.split('').map((letter, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <LetterSpan key={`${i}_${letter}`} pos={i}>
            {letter}
          </LetterSpan>
        ))}
      </TitleH1>

      <div className="d-flex h-auto flex-row">
        <span className="flex-1 d-flex h-auto flex-column mb-2 mt-2">
          <span className="mb-auto">{<AboutLink href="/about">{t('What is this?')}</AboutLink>}</span>
          <span className="mt-auto">
            {PACKAGE_VERSION && <VersionNumberBadge color="secondary">{`v${PACKAGE_VERSION}`}</VersionNumberBadge>}
          </span>
        </span>
      </div>
    </span>
  )
}

const AboutLink = styled(LinkSmart)`
  margin-bottom: auto;
`

export const Subtitle = styled.h2`
  text-align: center;
  font-size: 1.5rem;
  font-weight: 300;

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
