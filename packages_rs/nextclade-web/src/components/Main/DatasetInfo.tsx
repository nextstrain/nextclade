import React, { useMemo } from 'react'

import styled from 'styled-components'

import type { Dataset } from 'src/types'
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
  dataset: Dataset
}

export function DatasetInfo({ dataset }: DatasetInfoProps) {
  const { t } = useTranslationSafe()
  const tagFormatted = useMemo(() => dataset && formatDateIsoUtcSimple(dataset.attributes.tag.value), [dataset])

  const { name, reference } = dataset.attributes

  return (
    <DatasetinfoContainer>
      <DatasetName>{name.valueFriendly ?? name.value}</DatasetName>
      <DatasetInfoLine>
        {t('Reference: {{ name }} ({{ accession }})', {
          name: reference.valueFriendly ?? 'Untitled',
          accession: reference.value,
        })}
      </DatasetInfoLine>
      <DatasetInfoLine>{t('Updated: {{updated}}', { updated: tagFormatted })}</DatasetInfoLine>
      <DatasetInfoLine>{t('Dataset name: {{name}}', { name: name.value })}</DatasetInfoLine>
    </DatasetinfoContainer>
  )
}
