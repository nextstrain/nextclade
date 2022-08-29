import React, { useCallback, useMemo } from 'react'

import { ListGroup, ListGroupItem } from 'reactstrap'
import styled from 'styled-components'

import type { Dataset } from 'src/algorithms/types'
import { search } from 'src/helpers/search'
import { DatasetInfo } from 'src/components/Main/DatasetInfo'

export const DatasetSelectorListContainer = styled.div`
  flex: 1 0 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
  border: 1px #ccc solid;
  border-radius: 5px;
`

export const DatasetSelectorUl = styled(ListGroup)`
  flex: 0 1 100%;
  overflow-y: auto;
`

export const DatasetSelectorLi = styled(ListGroupItem)<{ $isDimmed?: boolean }>`
  margin: 0;
  padding: 0.5rem;
  cursor: pointer;
  opacity: ${(props) => props.$isDimmed && 0.33};
  background-color: transparent;
`

export interface DatasetSelectorListItemProps {
  dataset: Dataset
  isCurrent?: boolean
  isDimmed?: boolean
  onClick?: () => void
}

export function DatasetSelectorListItem({ dataset, isCurrent, isDimmed, onClick }: DatasetSelectorListItemProps) {
  return (
    <DatasetSelectorLi $isDimmed={isDimmed} aria-current={isCurrent} active={isCurrent} onClick={onClick}>
      <DatasetInfo dataset={dataset} />
    </DatasetSelectorLi>
  )
}

export interface DatasetSelectorListProps {
  datasets: Dataset[]
  searchTerm: string
  datasetHighlighted?: string
  onDatasetHighlighted(dataset: string): void
}

export function DatasetSelectorList({
  datasets,
  searchTerm,
  datasetHighlighted,
  onDatasetHighlighted,
}: DatasetSelectorListProps) {
  const onItemClick = useCallback(
    (dataset: Dataset) => () => onDatasetHighlighted(dataset.attributes.name.value),
    [onDatasetHighlighted],
  )

  const { itemsStartWith, itemsInclude, itemsNotInclude } = useMemo(() => {
    if (searchTerm.trim().length === 0) {
      return { itemsStartWith: datasets, itemsInclude: [], itemsNotInclude: [] }
    }

    return search(datasets, searchTerm, (dataset) => [
      dataset.attributes.name.value,
      dataset.attributes.name.valueFriendly ?? '',
      dataset.attributes.reference.value,
    ])
  }, [datasets, searchTerm])

  return (
    <DatasetSelectorUl>
      {[itemsStartWith, itemsInclude].map((datasets) =>
        datasets.map((dataset) => (
          <DatasetSelectorListItem
            key={dataset.attributes.name.value}
            dataset={dataset}
            onClick={onItemClick(dataset)}
            isCurrent={dataset.attributes.name.value === datasetHighlighted}
          />
        )),
      )}

      {[itemsNotInclude].map((datasets) =>
        datasets.map((dataset) => (
          <DatasetSelectorListItem
            key={dataset.attributes.name.value}
            dataset={dataset}
            onClick={onItemClick(dataset)}
            isCurrent={dataset.attributes.name.value === datasetHighlighted}
            isDimmed
          />
        )),
      )}
    </DatasetSelectorUl>
  )
}
