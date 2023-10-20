import { get, isNil, sortBy } from 'lodash'
import { lighten } from 'polished'
import React, { forwardRef, useCallback, useEffect, useMemo, useRef } from 'react'
import { ListGroup } from 'reactstrap'
import { useRecoilState, useRecoilValue } from 'recoil'
import { ListGenericCss } from 'src/components/Common/List'
import { DatasetInfo } from 'src/components/Main/DatasetInfo'
import { search } from 'src/helpers/search'
import {
  autodetectResultsAtom,
  AutodetectRunState,
  autodetectRunStateAtom,
  groupByDatasets,
} from 'src/state/autodetect.state'
import type { Dataset } from 'src/types'
import { areDatasetsEqual } from 'src/types'
import styled from 'styled-components'

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
  const [autodetectRunState, setAutodetectRunState] = useRecoilState(autodetectRunStateAtom)

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
        dataset.attributes.reference.valueFriendly ?? '',
      ],
    )
  }, [autodetectResult, searchTerm])

  const { itemsStartWith, itemsInclude, itemsNotInclude } = searchResult

  const itemsRef = useRef<Map<string, HTMLLIElement>>(new Map())

  function scrollToId(itemId: string) {
    const node = itemsRef.current.get(itemId)
    node?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  }

  if (datasetHighlighted) {
    scrollToId(datasetHighlighted.path)
  }

  useEffect(() => {
    const topSuggestion = autodetectResult.itemsInclude[0]
    if (autodetectRunState === AutodetectRunState.Done) {
      onDatasetHighlighted(topSuggestion)
      setAutodetectRunState(AutodetectRunState.Idle)
    }
  }, [autodetectRunState, autodetectResult.itemsInclude, onDatasetHighlighted, setAutodetectRunState])

  const listItems = useMemo(() => {
    return (
      <>
        {[itemsStartWith, itemsInclude].map((datasets) =>
          datasets.map((dataset) => (
            <DatasetSelectorListItem
              key={dataset.path}
              ref={nodeRefSetOrDelete(itemsRef.current, dataset.path)}
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
              ref={nodeRefSetOrDelete(itemsRef.current, dataset.path)}
              dataset={dataset}
              onClick={onItemClick(dataset)}
              isCurrent={areDatasetsEqual(dataset, datasetHighlighted)}
              isDimmed
            />
          )),
        )}
      </>
    )
  }, [datasetHighlighted, itemsInclude, itemsNotInclude, itemsStartWith, onItemClick])

  return <Ul>{listItems}</Ul>
}

function nodeRefSetOrDelete<T extends HTMLElement>(map: Map<string, T>, key: string) {
  return function nodeRefSetOrDeleteImpl(node: T) {
    if (node) {
      map.set(key, node)
    } else {
      map.delete(key)
    }
  }
}

export const Ul = styled(ListGroup)`
  ${ListGenericCss};
  flex: 1;
  overflow: auto;
  padding: 5px 5px;
  border-radius: 0 !important;
`

export const Li = styled.li<{ $active?: boolean; $isDimmed?: boolean }>`
  cursor: pointer;
  opacity: ${(props) => props.$isDimmed && 0.4};
  background-color: transparent;

  margin: 3px 3px !important;
  padding: 0 !important;
  border-radius: 5px !important;

  ${(props) =>
    props.$active &&
    `
    color: ${props.theme.white};
    background-color: ${lighten(0.033)(props.theme.primary)};
    box-shadow: -3px 3px 12px 3px #0005;
    opacity: ${props.$isDimmed && 0.66};
   `};
`

interface DatasetSelectorListItemProps {
  dataset: Dataset
  isCurrent?: boolean
  isDimmed?: boolean
  onClick?: () => void
}

const DatasetSelectorListItem = forwardRef<HTMLLIElement, DatasetSelectorListItemProps>(
  function DatasetSelectorListItemWithRef({ dataset, isCurrent, isDimmed, onClick }, ref) {
    return (
      <Li ref={ref} $isDimmed={isDimmed} aria-current={isCurrent} $active={isCurrent} onClick={onClick}>
        <DatasetInfo dataset={dataset} />
      </Li>
    )
  },
)
