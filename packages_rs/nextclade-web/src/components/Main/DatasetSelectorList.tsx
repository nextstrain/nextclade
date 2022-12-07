import React, { useCallback, useMemo } from 'react'

import { ListGroup, ListGroupItem } from 'reactstrap'
import styled from 'styled-components'

import type { Dataset } from 'src/types'
import { areDatasetsEqual } from 'src/types'
import { search } from 'src/helpers/search'
import { DatasetInfo } from 'src/components/Main/DatasetInfo'

export const DatasetSelectorContainer = styled.div`
  flex: 1 0 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
  border: 1px #ccc solid;
  border-radius: 5px;
`

export const DatasetSelectorUl = styled(ListGroup)`
  flex: 1;
  overflow-y: scroll;

  // prettier-ignore
  background:
    linear-gradient(#eaeaea 25%, rgba(255,255,255, 0)),
    linear-gradient(rgba(255,255,255, 0), #eaeaea 90%) 0 100%,
    radial-gradient(farthest-side at 50% 0, rgba(100,100,100, 0.25), rgba(0,0,0,0)),
    radial-gradient(farthest-side at 50% 100%, rgba(100,100,100, 0.25), rgba(0,0,0,0)) 0 100%;
  background-color: transparent;
  background-repeat: no-repeat;
  background-attachment: local, local, scroll, scroll;
  background-size: 100% 70px, 100% 70px, 100% 30px, 100% 30px;
`

export const DatasetSelectorLi = styled(ListGroupItem)<{ $isDimmed?: boolean }>`
  list-style: none;
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
  datasetHighlighted?: Dataset

  onDatasetHighlighted(dataset?: Dataset): void
}

export function DatasetSelectorList({
  datasets,
  searchTerm,
  datasetHighlighted,
  onDatasetHighlighted,
}: DatasetSelectorListProps) {
  const onItemClick = useCallback((dataset: Dataset) => () => onDatasetHighlighted(dataset), [onDatasetHighlighted])

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
    <DatasetSelectorContainer>
      <DatasetSelectorUl>
        {[itemsStartWith, itemsInclude].map((datasets) =>
          datasets.map((dataset) => (
            <DatasetSelectorListItem
              key={dataset.id}
              dataset={dataset}
              onClick={onItemClick(dataset)}
              isCurrent={areDatasetsEqual(dataset, datasetHighlighted)}
            />
          )),
        )}

        {[itemsNotInclude].map((datasets) =>
          datasets.map((dataset) => (
            <DatasetSelectorListItem
              key={dataset.id}
              dataset={dataset}
              onClick={onItemClick(dataset)}
              isCurrent={areDatasetsEqual(dataset, datasetHighlighted)}
              isDimmed
            />
          )),
        )}
      </DatasetSelectorUl>
    </DatasetSelectorContainer>
  )
}
