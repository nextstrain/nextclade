import React from 'react'
import { Col, Row } from 'reactstrap'
import { useRecoilValue, useResetRecoilState } from 'recoil'
import { MdClear as IconClearBase } from 'react-icons/md'
import { ButtonTransparent } from 'src/components/Common/ButtonTransparent'
import { ButtonLoadExample } from 'src/components/Main/ButtonLoadExample'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import styled from 'styled-components'
import { useUpdatedDataset } from 'src/io/fetchDatasets'
import { datasetCurrentAtom } from 'src/state/dataset.state'
import { DatasetCurrentUpdateNotification } from 'src/components/Main/DatasetCurrentUpdateNotification'
import { DatasetInfo } from 'src/components/Main/DatasetInfo'

export function DatasetCurrentSummary() {
  // Periodically checks if there's local update for the current dataset
  useUpdatedDataset()

  const { t } = useTranslationSafe()

  const dataset = useRecoilValue(datasetCurrentAtom)
  const resetDataset = useResetRecoilState(datasetCurrentAtom)

  if (!dataset) {
    return null
  }

  return (
    <Container>
      <DatasetCurrentUpdateNotification />

      <Row noGutters className="w-100">
        <Col className="d-flex">
          <DatasetInfo dataset={dataset} showSuggestions />
          <ButtonClear onClick={resetDataset} title={t('Reset dataset')}>
            <IconClear size={20} />
          </ButtonClear>
        </Col>
      </Row>
      <Row noGutters>
        <Col className="d-flex w-100">
          <ButtonLoadExample className="ml-auto" />
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
`

const ButtonClear = styled(ButtonTransparent)`
  display: inline;
  margin: 0 auto;
  height: 20px;
  width: 20px;
`

const IconClear = styled(IconClearBase)`
  * {
    color: ${(props) => props.theme.gray500};
  }
`
