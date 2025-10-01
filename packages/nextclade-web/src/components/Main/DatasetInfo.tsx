import React, { useMemo } from 'react'
import { Badge } from 'reactstrap'
import styled from 'styled-components'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { attrBoolMaybe } from 'src/types'
import type { Dataset } from 'src/types'
import { formatDatasetInfo } from 'src/components/Main/datasetInfoHelpers'
import { DatasetTagSelector } from 'src/components/Main/DatasetTagSelector'

export const DatasetNameHeading = styled.h4`
  display: flex;
  margin-bottom: 0;
  overflow: hidden;
`

export const DatasetName = styled.span.attrs(({ color }) => ({
  style: { color },
}))`
  font-size: 1.2rem;
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
  showTagSelector?: boolean
}

export function DatasetInfo({ dataset, showTagSelector = false, ...restProps }: DatasetInfoProps) {
  const { t } = useTranslationSafe()

  const { datasetName, datasetRef, datasetUpdatedAt, datasetPath } = useMemo(
    () => formatDatasetInfo(dataset, t),
    [dataset, t],
  )

  return (
    <div className="d-flex flex-column" {...restProps}>
      <DatasetNameHeading title={datasetName}>
        <DatasetName>{datasetName}</DatasetName>
        <DatasetInfoBadges dataset={dataset} />
      </DatasetNameHeading>

      <DatasetInfoLine title={datasetRef}>{datasetRef}</DatasetInfoLine>
      {showTagSelector ? (
        <DatasetTagSelector dataset={dataset}>
          <DatasetInfoLine title={datasetUpdatedAt}>{datasetUpdatedAt}</DatasetInfoLine>
        </DatasetTagSelector>
      ) : (
        <DatasetInfoLine title={datasetUpdatedAt}>{datasetUpdatedAt}</DatasetInfoLine>
      )}
      <DatasetInfoLine title={datasetPath}>{datasetPath}</DatasetInfoLine>
    </div>
  )
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
