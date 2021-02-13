import React from 'react'

import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import { ReactComponent as CladeSchemaSvg } from 'src/assets/img/nextstrain_clades.svg'

const CladeSchemaFigure = styled.figure`
  display: flex;
  width: 100%;
  max-width: 800px;
  flex-direction: column;
  margin: 0 auto;
`

const CladeSchemaPicture = styled.picture`
  flex: 1 0 100%;
`

const CladeSchemaFigcaption = styled.figcaption`
  flex: 1 0 100%;
`

export function CladeSchema() {
  const { t } = useTranslation()

  return (
    <CladeSchemaFigure className="figure w-100 text-center">
      <CladeSchemaPicture className="w-100 figure-img">
        <CladeSchemaSvg />
      </CladeSchemaPicture>
      <CladeSchemaFigcaption>
        <small>{t('Fig.1. Illustration of phylogenetic relationship of clades, as defined by Nextstrain')}</small>
      </CladeSchemaFigcaption>
    </CladeSchemaFigure>
  )
}
