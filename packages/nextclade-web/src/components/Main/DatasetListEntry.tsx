import React from 'react'
import { Col, Row } from 'reactstrap'
import styled from 'styled-components'
import type { Dataset } from 'src/types'
import { FlexContainer, FlexLeft, FlexRight } from 'src/components/Common/Flex'
import { DatasetInfoAutodetectProgressCircle } from 'src/components/Main/DatasetInfoAutodetectProgressCircle'
import { DatasetInfo } from 'src/components/Main/DatasetInfo'

export interface DatasetListEntryProps {
  dataset: Dataset
}

export function DatasetListEntry({ dataset }: DatasetListEntryProps) {
  return (
    <Container>
      <Row noGutters>
        <Col>
          <FlexContainer>
            <FlexLeft>
              <DatasetInfoAutodetectProgressCircle dataset={dataset} showSuggestions />
            </FlexLeft>
            <FlexRight>
              <DatasetInfo dataset={dataset} />
            </FlexRight>
          </FlexContainer>
        </Col>
      </Row>
    </Container>
  )
}

export const Container = styled.div`
  flex: 1;

  padding: 15px;
  box-shadow: 0 0 12px 0 #0002;
  border: 1px #ccc9 solid;
  border-radius: 5px;
`
