import { get, isNil, sortBy } from 'lodash'
import React, { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { DatasetSelectorListImpl } from 'src/components/Main/DatasetSelectorListImpl'
import { autodetectResultsAtom, groupByDatasets } from 'src/state/autodetect.state'
import type { Dataset } from 'src/types'

// HACK: dataset entry for 'autodetect' option. This is not a real dataset.
const DATASET_AUTODETECT: Dataset = {
  path: 'autodetect',
  enabled: true,
  official: true,
  attributes: {
    name: { value: 'autodetect', valueFriendly: 'Autodetect' },
    reference: { value: 'autodetect', valueFriendly: 'Autodetect' },
  },
  files: {
    reference: '',
    pathogenJson: '',
  },
}

export interface DatasetSelectorListProps {
  datasets: Dataset[]
  searchTerm: string
  datasetHighlighted?: Dataset
  onDatasetHighlighted?(dataset?: Dataset): void
}

export function DatasetSelectorList({
  datasets,
  searchTerm,
  datasetHighlighted,
  onDatasetHighlighted,
}: DatasetSelectorListProps) {
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

  const { itemsStartWith, itemsInclude, itemsNotInclude } = autodetectResult

  const datasetsActive = useMemo(() => {
    return [DATASET_AUTODETECT, ...itemsStartWith, ...itemsInclude]
  }, [itemsInclude, itemsStartWith])

  const datasetsInactive = useMemo(() => {
    return [...itemsNotInclude]
  }, [itemsNotInclude])

  return (
    <DatasetSelectorListImpl
      datasetsActive={datasetsActive}
      datasetsInactive={datasetsInactive}
      datasetHighlighted={datasetHighlighted}
      onDatasetHighlighted={onDatasetHighlighted}
      searchTerm={searchTerm}
    />
  )
}
