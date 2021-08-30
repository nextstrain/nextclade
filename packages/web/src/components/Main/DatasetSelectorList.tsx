import React, { useCallback } from 'react'

import { Button } from 'reactstrap'
import styled from 'styled-components'

import { formatDateIsoUtcSimple } from 'src/helpers/formatDate'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

import type { DatasetFlat } from 'src/algorithms/types'

export const DatasetSelectorContainer = styled.div`
  display: flex;
  flex-direction: column;
  overflow-y: scroll;

  // prettier-ignore
  background:
    linear-gradient(#eaeaea 50%, rgba(255,255,255, 0)),
    linear-gradient(rgba(255,255,255, 0), #eaeaea 90%) 0 100%,
    radial-gradient(farthest-side at 50% 0, rgba(100,100,100, 0.5), rgba(0,0,0,0)),
    radial-gradient(farthest-side at 50% 100%, rgba(100,100,100, 0.5), rgba(0,0,0,0)) 0 100%;
  background-color: #eaeaea;
  background-repeat: no-repeat;
  background-attachment: local, local, scroll, scroll;
  background-size: 100% 70px, 100% 70px, 100% 30px, 100% 30px;

  border: #acacac solid 1px;
  border-radius: 3px;
`

export const DatasetSelectorUl = styled.ul`
  display: block;
  width: 100%;
  height: 100%;
  max-height: 750px;

  flex: 0;
  padding: 0;
`

export const DatasetSelectorLi = styled.li<{ $isCurrent: boolean }>`
  list-style: none;
  margin: 0;
  padding: 1rem;

  background-color: ${(props) => (props.$isCurrent ? '#fff' : 'inherit')};
  border: ${(props) => (props.$isCurrent ? '#acacac solid 2px' : '#dadada solid 2px')};
`

export const DatasetName = styled.p`
  font-size: 1.2rem;
  font-weight: bold;
  padding: 0;
  margin: 0;
`

export interface DatasetSelectorListItemProps {
  dataset: DatasetFlat
  isCurrent: boolean
  onSelect(): void
}

export function DatasetSelectorListItem({ dataset, isCurrent, onSelect }: DatasetSelectorListItemProps) {
  const { t } = useTranslationSafe()

  return (
    <DatasetSelectorLi $isCurrent={isCurrent} aria-current={isCurrent}>
      <DatasetName>{dataset.nameFriendly}</DatasetName>
      <div>{dataset.description}</div>
      <div>
        {t('Reference: {{ ref }} ({{ source }}: {{ accession }})', {
          ref: dataset.reference.strainName,
          source: dataset.reference.source,
          accession: dataset.reference.accession,
        })}
      </div>
      <div>{t('Updated: {{ tag }}', { tag: formatDateIsoUtcSimple(dataset.tag) })}</div>
      <div>{t('Changes: {{ comment }}', { comment: dataset.comment })}</div>

      <Button title={t('Load this dataset')} onClick={onSelect}>
        {t('Select')}
      </Button>
    </DatasetSelectorLi>
  )
}

export interface DatasetSelectorListProps {
  datasets: DatasetFlat[]
  datasetCurrent: DatasetFlat
  setDatasetCurrent(dataset?: DatasetFlat): void
}

export function DatasetSelectorList({ datasets, datasetCurrent, setDatasetCurrent }: DatasetSelectorListProps) {
  const onSelect = useCallback((dataset: DatasetFlat) => () => setDatasetCurrent(dataset), [setDatasetCurrent])

  return (
    <DatasetSelectorContainer>
      <DatasetSelectorUl>
        {datasets.map((dataset) => (
          <DatasetSelectorListItem
            key={dataset.name}
            dataset={dataset}
            isCurrent={dataset.name === datasetCurrent.name}
            onSelect={onSelect(dataset)}
          />
        ))}
      </DatasetSelectorUl>
    </DatasetSelectorContainer>
  )
}
