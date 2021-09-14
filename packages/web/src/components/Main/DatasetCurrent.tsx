import React from 'react'

import { connect } from 'react-redux'
import { Col, Container, Row } from 'reactstrap'

import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { selectCurrentDataset } from 'src/state/algorithm/algorithm.selectors'
import { DatasetSelectorListItem } from 'src/components/Main/DatasetSelectorList'

import type { DatasetFlat } from 'src/algorithms/types'
import type { State } from 'src/state/reducer'

export interface DatasetCurrentProps {
  datasetCurrent?: DatasetFlat
}

const mapStateToProps = (state: State) => ({
  datasetCurrent: selectCurrentDataset(state),
})

const mapDispatchToProps = {}

export const DatasetCurrent = connect(mapStateToProps, mapDispatchToProps)(DatasetCurrentDisconnected)

export function DatasetCurrentDisconnected({ datasetCurrent }: DatasetCurrentProps) {
  const { t } = useTranslationSafe()

  if (!datasetCurrent) {
    return null
  }

  return (
    <Container fluid className="m-0 p-0">
      <Row noGutters>
        <Col>
          <h4 className="mb-0">{t('Selected pathogen')}</h4>
        </Col>
      </Row>

      <Row noGutters>
        <Col>
          <DatasetSelectorListItem dataset={datasetCurrent} />
        </Col>
      </Row>
    </Container>
  )
}
