import React from 'react'
import { Col, Row } from 'reactstrap'
import type { Dataset } from 'src/types'
import { ButtonLoadExample } from 'src/components/Main/ButtonLoadExample'
import { DatasetCustomizationsIndicatorLink } from 'src/components/Main/DatasetCustomizationIndicator'
import { LinkOpenTree } from 'src/components/Main/LinkOpenTree'
import styled from 'styled-components'
import { useUpdatedDataset } from 'src/io/fetchDatasets'
import { DatasetInfo } from 'src/components/Main/DatasetInfo'

export function DatasetSummary({ dataset }: { dataset: Dataset }) {
  useUpdatedDataset()

  return (
    <Container>
      {/* <DatasetCurrentUpdateNotification dataset={dataset} /> */}

      <Row noGutters>
        <Col>
          <Row noGutters>
            <Col>
              <DatasetInfo dataset={dataset} showSuggestions />
            </Col>
          </Row>

          <Row noGutters className="d-flex">
            <Col className="d-flex mr-auto mt-2">
              <DatasetCustomizationWrapper>
                <DatasetCustomizationsIndicatorLink />
              </DatasetCustomizationWrapper>
            </Col>
          </Row>
          <Row noGutters className="d-flex w-100">
            <Col className="d-flex">
              <div className="d-flex ml-auto">
                <LinkOpenTree className="my-auto" dataset={dataset} />
                <ButtonLoadExample dataset={dataset} />
              </div>
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  padding: 12px;
  border: 1px #ccc9 solid;
  border-radius: 5px;
  min-height: 200px;
`

const DatasetCustomizationWrapper = styled.div`
  margin-left: 90px;
`
