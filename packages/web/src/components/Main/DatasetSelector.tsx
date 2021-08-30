import React, { useMemo } from 'react'

import { connect } from 'react-redux'
import {
  selectDefaultDatasetName,
  selectDatasets,
  selectDefaultDatasetNameFriendly,
  selectCurrentDataset,
} from 'src/state/algorithm/algorithm.selectors'
import styled from 'styled-components'

import type { DatasetFlat } from 'src/algorithms/types'
import type { State } from 'src/state/reducer'
import { setCurrentDataset } from 'src/state/algorithm/algorithm.actions'
import { SpinnerWrapped } from 'src/components/Common/Spinner'
import { DatasetSelectorList } from './DatasetSelectorList'

const DatasetSelectorContainer = styled.div``

const DropdownLoadingOverlay = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  margin: auto;
`

const Spinner = styled(SpinnerWrapped)`
  flex: 1;
  margin: auto;
  height: 100%;
`

export interface DatasetSelectorProps {
  searchTerm: string
  datasets: DatasetFlat[]
  defaultDatasetName?: string
  datasetCurrent?: DatasetFlat
  setDatasetCurrent(dataset?: DatasetFlat): void
}

const mapStateToProps = (state: State) => ({
  datasets: selectDatasets(state),
  defaultDatasetName: selectDefaultDatasetName(state),
  defaultDatasetNameFriendly: selectDefaultDatasetNameFriendly(state),
  datasetCurrent: selectCurrentDataset(state),
})

const mapDispatchToProps = {
  setDatasetCurrent: setCurrentDataset,
}

export const DatasetSelector = connect(mapStateToProps, mapDispatchToProps)(DatasetSelectorDisconnected)

export function removeBoolean<T>(value: boolean | undefined | T): T | undefined {
  if (typeof value === 'boolean') {
    return undefined
  }
  return value
}

export function DatasetSelectorDisconnected({
  searchTerm,
  datasets,
  defaultDatasetName,
  datasetCurrent,
  setDatasetCurrent,
}: DatasetSelectorProps) {
  const isBusy = datasets.length === 0 || !datasetCurrent

  const datasetsFiltered = useMemo(() => {
    if (searchTerm.trim().length < 0) {
      return datasets
    }

    return datasets.filter((dataset) => {
      const candidates = [
        dataset.name,
        dataset.reference.strainName,
        dataset.reference.accession,
      ].map((searchTermWord) => searchTermWord.toLowerCase().trim())

      const searchTermWords = searchTerm.split(' ').map((searchTermWord) => searchTermWord.toLowerCase().trim())

      return candidates.some((candidate) =>
        searchTermWords.some((searchTermWord) => candidate.trim().toLowerCase().includes(searchTermWord)),
      )
    })
  }, [datasets, searchTerm])

  return (
    <DatasetSelectorContainer>
      {datasetCurrent && (
        <DatasetSelectorList
          datasets={datasetsFiltered}
          datasetCurrent={datasetCurrent}
          setDatasetCurrent={setDatasetCurrent}
        />
      )}

      {isBusy && <DropdownLoadingOverlay>{<Spinner type="ThreeDots" size={20} color="#aaa" />}</DropdownLoadingOverlay>}
    </DatasetSelectorContainer>
  )
}
