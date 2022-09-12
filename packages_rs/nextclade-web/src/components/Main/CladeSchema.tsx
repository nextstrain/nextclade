/* eslint-disable @next/next/no-img-element */
import React from 'react'

import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import CladeSchemaSvg from 'src/assets/img/clades.svg'

const CladeSchemaFigure = styled.figure`
  display: flex;
  width: 100%;
  max-width: 850px;
  flex-direction: column;
  margin: 0 auto;
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
      <CladeSchemaPicture className="w-100 figure-img">
        <img loading="lazy" src={CladeSchemaSvg as string} alt="Clade schema" />
      </CladeSchemaPicture>
      <CladeSchemaFigcaption>
        <small>
          {t('Fig.1. Illustration of phylogenetic relationships of SARS-CoV-2 clades, as defined by Nextstrain')}
        </small>
      </CladeSchemaFigcaption>
    </CladeSchemaFigure>
  )
}
