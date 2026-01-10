import React, { useMemo } from 'react'
import { Badge } from 'reactstrap'
import styled from 'styled-components'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { attrBoolMaybe } from 'src/types'
import type { Dataset } from 'src/types'
import { formatDatasetInfo } from 'src/components/Main/datasetInfoHelpers'
import { DatasetTagSelector } from 'src/components/Main/DatasetTagSelector'
import { DatasetTagBadge } from 'src/components/Main/DatasetTagBadge'
import { DatasetCollectionBadge } from 'src/components/Main/DatasetCollectionBadge'

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
  showBadge?: boolean
}

export interface DatasetUpdatedAtLineProps {
  dataset: Dataset
  datasetUpdatedAt: string
  showBadge: boolean
}

function DatasetUpdatedAtLine({ dataset, datasetUpdatedAt, showBadge }: DatasetUpdatedAtLineProps) {
  const { t } = useTranslationSafe()
  const tag = dataset.version?.tag ?? ''
  const versions = dataset.versions ?? []

  return (
    <DatasetUpdatedAtContainer title={datasetUpdatedAt}>
      <span>{datasetUpdatedAt}</span>
      {showBadge && <DatasetTagBadge tag={tag} versions={versions} t={t} />}
    </DatasetUpdatedAtContainer>
  )
}

export function DatasetInfo({ dataset, showTagSelector = false, showBadge = false, ...restProps }: DatasetInfoProps) {
  const { t } = useTranslationSafe()

  const { datasetName, datasetRef, datasetUpdatedAt, datasetPath } = useMemo(
    () => formatDatasetInfo(dataset, t),
    [dataset, t],
  )

  return (
    <div className="d-flex flex-column" {...restProps}>
      <DatasetNameHeading title={datasetName}>
        <DatasetName data-testid="dataset-name">{datasetName}</DatasetName>
        <DatasetInfoBadges dataset={dataset} />
      </DatasetNameHeading>

      <DatasetInfoLine title={datasetRef}>{datasetRef}</DatasetInfoLine>
      {showTagSelector ? (
        <DatasetTagSelector dataset={dataset}>
          <DatasetInfoLine title={datasetUpdatedAt}>{datasetUpdatedAt}</DatasetInfoLine>
        </DatasetTagSelector>
      ) : (
        <DatasetUpdatedAtLine dataset={dataset} datasetUpdatedAt={datasetUpdatedAt} showBadge={showBadge} />
      )}
      <DatasetInfoLine title={datasetPath}>{datasetPath}</DatasetInfoLine>
    </div>
  )
}

export function DatasetInfoBadges({ dataset: { attributes, collectionId } }: { dataset: Dataset }) {
  const { t } = useTranslationSafe()

  return (
    <span className="d-flex ml-auto">
      {collectionId && <DatasetCollectionBadge collectionId={collectionId} />}

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
`

const DatasetUpdatedAtContainer = styled(DatasetInfoLine)`
  display: flex;
  align-items: center;
  gap: 6px;
`
