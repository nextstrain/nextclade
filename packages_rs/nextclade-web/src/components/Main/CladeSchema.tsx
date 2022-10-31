import React from 'react'
import styled from 'styled-components'

import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'
import { URL_CLADE_SCHEMA_REPO, URL_CLADE_SCHEMA_SVG } from 'src/constants'
import { LinkExternal } from 'src/components/Link/LinkExternal'

const CladeSchemaFigure = styled.figure`
  display: flex;
  width: 100%;
  max-width: 850px;
  flex-direction: column;
  margin: 0 auto;
  margin-bottom: 2rem;
`

const CladeSchemaPicture = styled.picture`
  flex: 0 1 100%;
`

const CladeSchemaFigcaption = styled.figcaption`
  flex: 1 1 100%;
`

export function CladeSchema() {
  const { t } = useTranslation()

  return (
    <CladeSchemaFigure className="figure w-100 text-center">
      <LinkExternal url={URL_CLADE_SCHEMA_SVG}>
        <CladeSchemaPicture className="w-100 figure-img">
          <img
            src={URL_CLADE_SCHEMA_SVG}
            alt="Illustration of phylogenetic relationships of SARS-CoV-2 clades, as defined by Nextstrain"
          />
        </CladeSchemaPicture>
      </LinkExternal>
      <CladeSchemaFigcaption>
        <small>
          {t('Fig.1. Illustration of phylogenetic relationships of SARS-CoV-2 clades, as defined by Nextstrain')}
          {' ('}
          <LinkExternal url={URL_CLADE_SCHEMA_REPO}>{t('source')}</LinkExternal>
          {')'}
        </small>
      </CladeSchemaFigcaption>
    </CladeSchemaFigure>
  )
}
