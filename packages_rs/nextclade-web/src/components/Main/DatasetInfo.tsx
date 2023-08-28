import React, { useMemo } from 'react'
import { Badge } from 'reactstrap'

import styled from 'styled-components'

import type { Dataset } from 'src/types'
import { formatDateIsoUtcSimple } from 'src/helpers/formatDate'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

export const DatasetInfoContainer = styled.div``

export const DatasetName = styled.h4`
  display: flex;
  font-weight: bold;
  margin: 0;
  padding: 0;
  height: 100%;
`

export const DatasetInfoLine = styled.p`
  font-size: 0.9rem;
  padding: 0;
  margin: 0;
`

const DatasetInfoBadge = styled(Badge)`
  font-size: 0.8rem;
  margin-top: 2px !important;
  padding: 0.25rem 0.5rem;
`

export interface DatasetInfoProps {
  dataset: Dataset
}

export function DatasetInfo({ dataset }: DatasetInfoProps) {
  const { t } = useTranslationSafe()
  const { attributes, official, deprecated, enabled, experimental, path, version } = dataset
  const { name, reference } = attributes

  const updatedAt = useMemo(() => {
    let updatedAt = version?.updatedAt ? formatDateIsoUtcSimple(version?.updatedAt) : 'unknown'
    if (version?.tag === 'unreleased') {
      updatedAt = `${updatedAt} (unreleased)`
    }
    return updatedAt
  }, [version?.tag, version?.updatedAt])

  if (!enabled) {
    return null
  }

  return (
    <DatasetInfoContainer>
      <DatasetName>
        <span>{name.valueFriendly ?? name.value ?? path}</span>

        <span className="d-flex ml-auto">
          {official ? (
            <DatasetInfoBadge
              className="ml-2 my-auto"
              color="success"
              title="This dataset is provided by Nextclade team."
            >
              {t('official')}
            </DatasetInfoBadge>
          ) : (
            <DatasetInfoBadge
              className="ml-2 my-auto"
              color="info"
              title="This dataset is provided by the community members. Nextclade team cannot verify correctness of community datasets or provide support for them. Use at own risk. Please contact dataset authors for all questions."
            >
              {t('community')}
            </DatasetInfoBadge>
          )}

          {experimental && (
            <DatasetInfoBadge
              className="ml-2 my-auto"
              color="warning"
              title="Dataset authors marked this dataset as experimental, which means the dataset is stil under development, is of lower quality than usual or has other issues. Use at own risk. Please contact dataset authors for specifics."
            >
              {t('experimental')}
            </DatasetInfoBadge>
          )}

          {deprecated && (
            <DatasetInfoBadge
              className="ml-2 my-auto"
              color="secondary"
              title="Dataset authors marked this dataset as deprecated, which means the dataset is obsolete, will no longer be updated or is not relevant otherwise. Please contact dataset authors for specifics."
            >
              {t('deprecated')}
            </DatasetInfoBadge>
          )}
        </span>
      </DatasetName>

      <DatasetInfoLine>
        {t('Reference: {{ name }} ({{ accession }})', {
          name: reference.valueFriendly ?? 'Untitled',
          accession: reference.value,
        })}
      </DatasetInfoLine>
      <DatasetInfoLine>{t('Updated at: {{updated}}', { updated: updatedAt })}</DatasetInfoLine>
      <DatasetInfoLine>{t('Dataset name: {{name}}', { name: path })}</DatasetInfoLine>
    </DatasetInfoContainer>
  )
}
