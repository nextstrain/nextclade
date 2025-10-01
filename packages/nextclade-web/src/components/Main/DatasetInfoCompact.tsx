import React from 'react'
import { Col, Row } from 'reactstrap'
import styled from 'styled-components'
import type { Dataset } from 'src/types'
import { FlexContainer, FlexLeft, FlexRight } from 'src/components/Common/Flex'
import { ButtonLoadExample } from 'src/components/Main/ButtonLoadExample'
import { DatasetInfoAutodetectProgressCircle } from 'src/components/Main/DatasetInfoAutodetectProgressCircle'
import { LinkOpenTree } from 'src/components/Main/LinkOpenTree'
import { DatasetInfo } from 'src/components/Main/DatasetInfo'

export interface DatasetInfoProps {
  dataset: Dataset
}

export function DatasetInfoCompact({ dataset, ...restProps }: DatasetInfoProps) {
  return (
    <Container {...restProps}>
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
  )
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  padding: 8px 12px;
  border: 1px #ccc9 solid;
  border-radius: 5px;
`
