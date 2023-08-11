import React, { useMemo, useState } from 'react'
import { useRecoilValue } from 'recoil'
import { Col, Container, Row } from 'reactstrap'
import { DatasetContentSection } from 'src/components/Main/DatasetContentSection'
import styled from 'styled-components'
import { DatasetSelector } from 'src/components/Main/DatasetSelector'
import { MainInputFormRunStep } from 'src/components/Main/MainInputFormRunStep'
import { datasetCurrentAtom } from 'src/state/dataset.state'
import { useUpdatedDatasetIndex } from 'src/io/fetchDatasets'

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
      <Row noGutters className="flex-column-reverse flex-lg-row">
        <Col lg={6}>
          <DatasetContentSection
            changelogUrl="https://raw.githubusercontent.com/nextstrain/nextclade_data/v3/CHANGELOG.md"
            readmeUrl="https://raw.githubusercontent.com/nextstrain/nextclade_data/v3/data_v3/sars-cov-2/MN908947/README.md"
          />
        </Col>
        <Col lg={6}>
          <Centered>{FormBody}</Centered>
        </Col>
      </Row>
    </Container>
  )
}
