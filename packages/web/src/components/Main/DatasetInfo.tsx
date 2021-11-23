import React, { useMemo } from 'react'

import styled from 'styled-components'

import type { DatasetFlat } from 'src/algorithms/types'
import { formatDateIsoUtcSimple } from 'src/helpers/formatDate'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

export const DatasetinfoContainer = styled.div``

export const DatasetName = styled.h6`
  font-size: 1.3rem;
  font-weight: bold;
  padding: 0;
  margin: 0;
`

export const DatasetInfoLine = styled.p`
  font-size: 0.8rem;
  padding: 0;
  margin: 0;
`

export interface DatasetInfoProps {
  dataset: DatasetFlat
}

export function DatasetInfo({ dataset }: DatasetInfoProps) {
  const { t } = useTranslationSafe()
  const tagFormatted = useMemo(() => dataset && formatDateIsoUtcSimple(dataset.tag), [dataset])

  return (
    <DatasetinfoContainer>
      <DatasetName>{dataset.nameFriendly}</DatasetName>
      <DatasetInfoLine>
        {t('Reference: {{ ref }} ({{ source }}: {{ accession }})', {
          ref: dataset.reference.strainName,
          source: dataset.reference.source,
          accession: dataset.reference.accession,
        })}
      </DatasetInfoLine>
      <DatasetInfoLine>{t('Updated: {{updated}}', { updated: tagFormatted })}</DatasetInfoLine>
    </DatasetinfoContainer>
  )
}
