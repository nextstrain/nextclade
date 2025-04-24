import React, { useMemo } from 'react'
import { Badge } from 'reactstrap'
import styled from 'styled-components'
import { colorHash } from 'src/helpers/colorHash'
import { formatDateIsoUtcSimple } from 'src/helpers/formatDate'
import { TFunc, useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { AnyType, attrBoolMaybe, attrStrMaybe, DatasetVersion } from 'src/types'
import type { Dataset } from 'src/types'

export const DatasetName = styled.h4.attrs(({ color }) => ({
  style: { color },
}))`
  display: flex;

  font-size: 1.2rem;
  margin-bottom: 0;
  font-weight: bold;

  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const DatasetInfoLine = styled.span`
  font-size: 0.9rem;
  padding: 0;
  margin: 0;

  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:after {
    content: ' ';
    white-space: pre;
  }
`

export interface DatasetInfoProps {
  dataset: Dataset
  showSuggestions?: boolean
}

export function DatasetInfo({ dataset, ...restProps }: DatasetInfoProps) {
  const { t } = useTranslationSafe()

  const { datasetName, datasetRef, datasetUpdatedAt, datasetPath, color } = useMemo(
    () => formatDatasetInfo(dataset, t),
    [dataset, t],
  )

  return (
    <div className="d-flex flex-column" {...restProps}>
      <DatasetName title={datasetName} color={color}>
        <span>{datasetName}</span>
        <DatasetInfoBadges dataset={dataset} />
      </DatasetName>

      <DatasetInfoLine title={datasetRef}>{datasetRef}</DatasetInfoLine>
      <DatasetInfoLine title={datasetUpdatedAt}>{datasetUpdatedAt}</DatasetInfoLine>
      <DatasetInfoLine title={datasetPath}>{datasetPath}</DatasetInfoLine>
    </div>
  )
}

export function formatDatasetInfo(dataset: Dataset, t: TFunc) {
  const { attributes, path, version } = dataset
  const datasetName = attrStrMaybe(attributes, 'name') ?? path
  const datasetRef = t('Reference: {{ ref }}', { ref: formatReference(attributes) })
  const datasetUpdatedAt = t('Updated at: {{updated}}', { updated: formatUpdatedAt(version, t) })
  const datasetPath = t('Dataset name: {{name}}', { name: path })
  const color = colorHash(path, {
    lightness: [0.35, 0.5],
    saturation: [0.35, 0.5],
  })
  return { attributes, path, datasetName, datasetRef, datasetUpdatedAt, datasetPath, color }
}

export function formatReference(attributes: Record<string, AnyType> | undefined) {
  const name = attrStrMaybe(attributes, 'reference name') ?? 'unknown'
  const accession = attrStrMaybe(attributes, 'reference accession')
  if (accession) {
    return `${name} (${accession})`
  }
  return name
}

export function formatUpdatedAt(version: DatasetVersion | undefined, t: TFunc) {
  let updatedAt = version?.updatedAt ? formatDateIsoUtcSimple(version?.updatedAt) : t('unknown')
  if (version?.tag === 'unreleased') {
    updatedAt = `${updatedAt} (${t('unreleased')})`
  }
  return updatedAt ?? t('unknown')
}

export function DatasetInfoBadges({ dataset: { path, attributes } }: { dataset: Dataset }) {
  const { t } = useTranslationSafe()

  return (
    <span className="d-flex ml-auto">
      {path.startsWith('nextstrain') ? (
        <DatasetInfoBadge
          className="mr-1 my-0"
          color="success"
          title={t('This dataset is provided by {{proj}} developers.', { proj: 'Nextclade' })}
        >
          {t('official')}
        </DatasetInfoBadge>
      ) : (
        <DatasetInfoBadge
          className="mr-1 my-0"
          color="info"
          title={t(
            'This dataset is provided by the community members. {{proj}} developers cannot verify correctness of community datasets or provide support for them. Use at own risk. Please contact dataset authors for all questions.',
            { proj: 'Nextclade' },
          )}
        >
          {t('community')}
        </DatasetInfoBadge>
      )}

      {attrBoolMaybe(attributes, 'experimental') && (
        <DatasetInfoBadge
          className="mr-1 my-0"
          color="warning"
          title={t(
            'Dataset authors marked this dataset as experimental, which means the dataset is still under development, is of lower quality than usual or has other issues. Use at own risk. Please contact dataset authors for specifics.',
          )}
        >
          {t('experimental')}
        </DatasetInfoBadge>
      )}

      {attrBoolMaybe(attributes, 'deprecated') && (
        <DatasetInfoBadge
          className="mr-1 my-0"
          color="secondary"
          title={t(
            'Dataset authors marked this dataset as deprecated, which means the dataset is obsolete, will no longer be updated or is not relevant otherwise. Please contact dataset authors for specifics.',
          )}
        >
          {t('deprecated')}
        </DatasetInfoBadge>
      )}
    </span>
  )
}

const DatasetInfoBadge = styled(Badge)`
  font-size: 0.7rem;
  padding: 0.11rem 0.2rem;
  border-radius: 3px;
`
