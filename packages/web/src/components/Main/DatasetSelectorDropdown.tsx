import React, { useCallback, useMemo } from 'react'

import styled from 'styled-components'

import type { DatasetFlat } from 'src/algorithms/types'
import { Dropdown as DropdownBase } from 'src/components/Common/Dropdown'
import { DropdownOption, stringToOption } from 'src/components/Common/DropdownOption'

const Dropdown = styled(DropdownBase)`
  position: absolute;
  top: 0;
  left: 0;
`

export interface DatasetSelectorDropdown {
  datasets: DatasetFlat[]
  datasetCurrent: DatasetFlat
  setDatasetCurrent(dataset?: DatasetFlat): void
}

export function DatasetSelectorDropdown({ datasets, datasetCurrent, setDatasetCurrent }: DatasetSelectorDropdown) {
  const current = useMemo(() => stringToOption(datasetCurrent.nameFriendly), [datasetCurrent.nameFriendly])
  const options = useMemo(() => datasets.map((dataset) => stringToOption(dataset.nameFriendly)), [datasets])

  const onOptionChange = useCallback(
    (option: DropdownOption<string>) => {
      const dataset = datasets.find((dataset) => dataset.nameFriendly === option.label)
      setDatasetCurrent(dataset)
    },
    [datasets, setDatasetCurrent],
  )

  return <Dropdown identifier="dataset.name" options={options} value={current} onOptionChange={onOptionChange} />
}
