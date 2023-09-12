import { get, isNil, sortBy } from 'lodash'
import React, { HTMLProps, useCallback, useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import type { Dataset } from 'src/types'
import { areDatasetsEqual } from 'src/types'
import { autodetectResultsAtom, groupByDatasets } from 'src/state/autodetect.state'
import { search } from 'src/helpers/search'
import { DatasetInfo } from 'src/components/Main/DatasetInfo'

export const DatasetSelectorUl = styled.ul`
  flex: 1;
  overflow-y: scroll;
  height: 100%;
  padding: 0;
`

export const DatasetSelectorLi = styled(motion.li)<{ $active?: boolean; $isDimmed?: boolean }>`
  list-style: none;
  margin: 0;
  padding: 0.5rem;
  cursor: pointer;
  filter: ${(props) => props.$isDimmed && !props.$active && 'invert(0.1) brightness(0.9)'};
  background-color: ${(props) => (props.$active ? props.theme.primary : props.theme.bodyBg)};
  color: ${(props) => props.$active && props.theme.white};
  border: ${(props) => props.theme.gray400} solid 1px;
`

const TRANSITION = {
  type: 'tween',
  ease: 'linear',
  duration: 0.2,
}

export interface DatasetSelectorListItemProps {
  dataset: Dataset
  isCurrent?: boolean
  isDimmed?: boolean
  onClick?: () => void
}

export function DatasetSelectorListItem({ dataset, isCurrent, isDimmed, onClick }: DatasetSelectorListItemProps) {
  return (
    <DatasetSelectorLi
      $isDimmed={isDimmed}
      aria-current={isCurrent}
      $active={isCurrent}
      onClick={onClick}
      layout
      transition={TRANSITION}
    >
      <DatasetInfo dataset={dataset} />
    </DatasetSelectorLi>
  )
}

export interface DatasetSelectorListProps extends HTMLProps<HTMLUListElement> {
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
