import React, { useMemo, useState } from 'react'
import { useRecoilValue } from 'recoil'
import styled from 'styled-components'
import { Col, Container as ContainerBase, Row } from 'reactstrap'
import { DatasetContentSection } from 'src/components/Main/DatasetContentSection'
import { DatasetSelector } from 'src/components/Main/DatasetSelector'
import { MainInputFormRunStep } from 'src/components/Main/MainInputFormRunStep'
import { datasetCurrentAtom } from 'src/state/dataset.state'
import { useUpdatedDatasetIndex } from 'src/io/fetchDatasets'

const Container = styled(ContainerBase)`
  max-height: 100%;
  height: 100%;
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
      <Row noGutters className="flex-column-reverse flex-lg-row">
        <Col lg={6}>
          <DatasetContentSection />
        </Col>
        <Col lg={6}>{FormBody}</Col>
      </Row>
    </Container>
  )
}
