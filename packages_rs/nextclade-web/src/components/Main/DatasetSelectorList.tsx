import { get, isNil, sortBy } from 'lodash'
import React, { useCallback, useMemo } from 'react'
import { ListGroup, ListGroupItem } from 'reactstrap'
import { useRecoilValue } from 'recoil'
import styled from 'styled-components'
import type { Dataset } from 'src/types'
import { areDatasetsEqual } from 'src/types'
import { autodetectResultsAtom, groupByDatasets } from 'src/state/autodetect.state'
import { search } from 'src/helpers/search'
import { DatasetInfo } from 'src/components/Main/DatasetInfo'

export const DatasetSelectorUl = styled(ListGroup)`
  flex: 1;
  overflow-y: scroll;
  height: 100%;
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

  const autodetectResults = useRecoilValue(autodetectResultsAtom)

  const autodetectResult = useMemo(() => {
    if (isNil(autodetectResults) || autodetectResults.length === 0) {
      return { itemsStartWith: [], itemsInclude: datasets, itemsNotInclude: [] }
    }

    const recordsByDataset = groupByDatasets(autodetectResults)

    let itemsInclude = datasets.filter((candidate) =>
      Object.entries(recordsByDataset).some(([dataset, _]) => dataset === candidate.path),
    )

    itemsInclude = sortBy(itemsInclude, (dataset) => -get(recordsByDataset, dataset.path, []).length)

    const itemsNotInclude = datasets.filter((candidate) => !itemsInclude.map((it) => it.path).includes(candidate.path))

    return { itemsStartWith: [], itemsInclude, itemsNotInclude }
  }, [autodetectResults, datasets])

  const searchResult = useMemo(() => {
    if (searchTerm.trim().length === 0) {
      return autodetectResult
    }

    return search(
      [...autodetectResult.itemsStartWith, ...autodetectResult.itemsInclude, ...autodetectResult.itemsNotInclude],
      searchTerm,
      (dataset) => [
        dataset.attributes.name.value,
        dataset.attributes.name.valueFriendly ?? '',
        dataset.attributes.reference.value,
      ],
    )
  }, [autodetectResult, searchTerm])

  const { itemsStartWith, itemsInclude, itemsNotInclude } = searchResult

  return (
    <DatasetSelectorUl>
      {[itemsStartWith, itemsInclude].map((datasets) =>
        datasets.map((dataset) => (
          <DatasetSelectorListItem
            key={dataset.path}
            dataset={dataset}
            onClick={onItemClick(dataset)}
            isCurrent={areDatasetsEqual(dataset, datasetHighlighted)}
          />
        )),
      )}

      {[itemsNotInclude].map((datasets) =>
        datasets.map((dataset) => (
          <DatasetSelectorListItem
            key={dataset.path}
            dataset={dataset}
            onClick={onItemClick(dataset)}
            isCurrent={areDatasetsEqual(dataset, datasetHighlighted)}
            isDimmed
          />
        )),
      )}
    </DatasetSelectorUl>
  )
}
