import React, { useMemo, useState } from 'react'

import { useRecoilValue } from 'recoil'
import { Container as ContainerBase } from 'reactstrap'
import styled from 'styled-components'

import { DatasetSelector } from 'src/components/Main/DatasetSelector'
import { MainInputFormRunStep } from 'src/components/Main/MainInputFormRunStep'
import { datasetCurrentAtom } from 'src/state/dataset.state'
import { useUpdatedDatasetIndex } from 'src/io/fetchDatasets'

export const Container = styled(ContainerBase)`
  display: flex;
  margin: 0;
  padding: 0;
`

export const Centered = styled.section`
  margin: auto;

  @media (min-width: 768px) {
    min-width: 600px;
  }

  @media (max-width: 767.98px) {
    margin: 0;
    width: 100%;
  }

  max-width: 800px;
`

export function MainInputForm() {
  const [searchTerm, setSearchTerm] = useState('')
  const currentDataset = useRecoilValue(datasetCurrentAtom)

  // This periodically fetches dataset index and updates the list of datasets.
  useUpdatedDatasetIndex()

  const FormBody = useMemo(
    () =>
      currentDataset ? (
        <MainInputFormRunStep />
      ) : (
        <DatasetSelector searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
      ),
    [currentDataset, searchTerm],
  )

  return (
    <Container fluid>
      <Centered>{FormBody}</Centered>
    </Container>
  )
}
