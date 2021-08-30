import React, { useCallback, useState } from 'react'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

import styled from 'styled-components'
import { FaClock } from 'react-icons/fa'

import {
  CardL1 as CardL1Base,
  CardL1Body as CardL1BodyBase,
  CardL1Header as CardL1HeaderBase,
} from 'src/components/Common/Card'

import { DatasetSelector } from 'src/components/Main/DatasetSelector'
import { Col, Input, Row } from 'reactstrap'

export const FillVertical = styled.div`
  display: flex;
  height: 100%;
  flex-direction: column;
`

export const CardL1 = styled(CardL1Base)`
  flex: 1;

  @media (max-width: ${(props) => props.theme.lg}) {
    display: none;
    margin-bottom: 15px;
  }

  background-color: ${(props) => props.theme.gray100};
`

export const CardL1Header = styled(CardL1HeaderBase)``

export const CardL1Body = styled(CardL1BodyBase)`
  display: flex;
  flex-direction: column;
  opacity: 0.85;
`

export const FlexRight = styled.div`
  align-content: flex-start;
`

export const Centered = styled.div`
  margin: auto;
`

export const PreviousResultsHeaderIcon = styled(FaClock)`
  margin: auto;
  margin-right: 0.5rem;
  margin-bottom: 5px;
`

export function PreviousResultsCard() {
  const { t } = useTranslationSafe()

  const [searchTerm, setSearchTerm] = useState('')

  const onSearchTermChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target
    setSearchTerm(value)
  }, [])

  return (
    <FillVertical>
      <CardL1>
        <CardL1Body>
          <Row>
            <Col>
              <h5 className="mb-0">{t('Datasets')}</h5>
              <p className="mt-0">{t('Select a dataset to run the analysis against')}</p>
            </Col>
            <Col>
              <Input
                type="text"
                title="Search datasets"
                placeholder="Search datasets"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-gramm="false"
                onChange={onSearchTermChange}
              />
            </Col>
          </Row>
          <Row>
            <Col>
              <DatasetSelector searchTerm={searchTerm} />
            </Col>
          </Row>
        </CardL1Body>
      </CardL1>
    </FillVertical>
  )
}
