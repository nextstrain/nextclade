import React, { useMemo, useState } from 'react'

import { connect } from 'react-redux'
import { Container as ContainerBase } from 'reactstrap'
import styled from 'styled-components'

import type { DatasetFlat } from 'src/algorithms/types'
import type { State } from 'src/state/reducer'
import { selectCurrentDataset } from 'src/state/algorithm/algorithm.selectors'
import { DatasetSelector } from 'src/components/Main/DatasetSelector'
import { MainInputFormRunStep } from 'src/components/Main/MainInputFormRunStep'

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

export interface MainInputFormProps {
  currentDataset?: DatasetFlat
}

const mapStateToProps = (state: State) => ({
  currentDataset: selectCurrentDataset(state),
})

export const MainInputForm = connect(mapStateToProps, null)(MainInputFormDisconnected)

export function MainInputFormDisconnected({ currentDataset }: MainInputFormProps) {
  const [searchTerm, setSearchTerm] = useState('')

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
