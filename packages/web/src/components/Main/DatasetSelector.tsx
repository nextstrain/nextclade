import React from 'react'

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
import { DatasetSelectorDropdown } from './DatasetSelectorDropdown'

const DropdownContainer = styled.div`
  position: relative;
  flex: 0 0 235px;
  margin-right: auto;
  margin-left: 5px;
  height: 40px;

  @media (max-width: 767.98px) {
    margin-left: auto;
    margin-right: auto;
  }
`

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
  datasets,
  defaultDatasetName,
  datasetCurrent,
  setDatasetCurrent,
}: DatasetSelectorProps) {
  const isBusy = datasets.length === 0 || !datasetCurrent

  return (
    <DropdownContainer>
      {datasetCurrent && (
        <DatasetSelectorDropdown
          datasets={datasets}
          datasetCurrent={datasetCurrent}
          setDatasetCurrent={setDatasetCurrent}
        />
      )}

      {isBusy && <DropdownLoadingOverlay>{<Spinner type="ThreeDots" size={20} color="#aaa" />}</DropdownLoadingOverlay>}
    </DropdownContainer>
  )
}
