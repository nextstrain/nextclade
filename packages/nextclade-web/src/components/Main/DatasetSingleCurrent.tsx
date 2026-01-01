import React from 'react'
import { Col, Row } from 'reactstrap'
import { DatasetCurrentUpdateNotification } from 'src/components/Main/DatasetCurrentUpdateNotification'
import styled from 'styled-components'
import type { Dataset } from 'src/types'
import { DatasetInfo } from 'src/components/Main/DatasetInfo'
import { ButtonLoadExample } from 'src/components/Main/ButtonLoadExample'
import { DatasetCustomizationsIndicatorLink } from 'src/components/Main/DatasetCustomizationIndicator'
import { LinkOpenTree } from 'src/components/Main/LinkOpenTree'
import { useUpdatedDataset } from 'src/io/fetchDatasets'
import { FlexContainer, FlexLeft, FlexRight } from 'src/components/Common/Flex'
import { DatasetInfoAutodetectProgressCircle } from 'src/components/Main/DatasetInfoAutodetectProgressCircle'

export function DatasetSingleCurrent({ dataset }: { dataset: Dataset }) {
  useUpdatedDataset()

  return (
    <Row noGutters className="my-1">
      <Col>
        <Container>
          <DatasetCurrentUpdateNotification dataset={dataset} />

          <Row noGutters>
            <Col>
              <Row noGutters>
                <Col>
                  <FlexContainer>
                    <FlexLeft>
                      <DatasetInfoAutodetectProgressCircle dataset={dataset} showSuggestions />
                    </FlexLeft>
                    <FlexRight>
                      <DatasetInfo dataset={dataset} showTagSelector showBadge />
                    </FlexRight>
                  </FlexContainer>
                </Col>
              </Row>

              <DatasetCustomizationsIndicatorLink />

              <Row noGutters className="d-flex w-100">
                <Col className="d-flex">
                  <div className="d-flex ml-auto">
                    <LinkOpenTree className="ml-1" dataset={dataset} />
                    <ButtonLoadExample className="ml-1" dataset={dataset} />
                  </div>
                </Col>
              </Row>
            </Col>
          </Row>
        </Container>
      </Col>
    </Row>
  )
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  padding: 8px 12px;
  border: 1px #ccc9 solid;
  border-radius: 5px;
`
