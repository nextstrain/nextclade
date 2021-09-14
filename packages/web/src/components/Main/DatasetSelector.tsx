import classNames from 'classnames'
import React, { useCallback, useState } from 'react'

import { connect } from 'react-redux'
import { Button, Col, Container, Input, Row } from 'reactstrap'
import styled from 'styled-components'

import type { DatasetFlat } from 'src/algorithms/types'
import type { State } from 'src/state/reducer'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { setCurrentDataset } from 'src/state/algorithm/algorithm.actions'
import { SpinnerWrapped } from 'src/components/Common/Spinner'
import { selectDatasets, selectCurrentDataset, selectDefaultDataset } from 'src/state/algorithm/algorithm.selectors'
import { DatasetSelectorList } from './DatasetSelectorList'

const DatasetSelectorContainer = styled.div`
  display: flex;
  width: 100%;
  height: 300px;
`

const Spinner = styled(SpinnerWrapped)`
  flex: 1;
  margin: auto;
  height: 100%;
`

export interface DatasetSelectorProps {
  searchTerm: string
  datasets: DatasetFlat[]
  datasetDefault?: DatasetFlat
  datasetCurrent?: DatasetFlat
  setDatasetCurrent(dataset?: DatasetFlat): void
  setSearchTerm(searchTerm: string): void
}

const mapStateToProps = (state: State) => ({
  datasets: selectDatasets(state),
  datasetDefault: selectDefaultDataset(state),
  datasetCurrent: selectCurrentDataset(state),
})

const mapDispatchToProps = {
  setDatasetCurrent: setCurrentDataset,
}

export const DatasetSelector = connect(mapStateToProps, mapDispatchToProps)(DatasetSelectorDisconnected)

export function DatasetSelectorDisconnected({
  searchTerm,
  datasets,
  datasetDefault,
  datasetCurrent,
  setDatasetCurrent,
  setSearchTerm,
}: DatasetSelectorProps) {
  const { t } = useTranslationSafe()
  const [error, setError] = useState<string | undefined>()
  const [datasetHighlighted, setDatasetHighlighted] = useState<DatasetFlat | undefined>(datasetDefault)

  const onSearchTermChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target
      setSearchTerm(value)
    },
    [setSearchTerm],
  )

  const onNextClicked = useCallback(() => {
    if (datasetHighlighted) {
      setDatasetCurrent(datasetHighlighted)
      setError(undefined)
    } else {
      setError(t('Please select a pathogen first'))
    }
  }, [datasetHighlighted, setDatasetCurrent, t])

  const isBusy = datasets.length === 0

  return (
    <Container fluid className="m-0 p-0 w-100">
      <Row noGutters>
        <Col>
          <h3 className="mb-0">{t('Select a pathogen')}</h3>
        </Col>

        <Col>
          <Input
            type="text"
            title="Search pathogens"
            placeholder="Search pathogens"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-gramm="false"
            value={searchTerm}
            onChange={onSearchTermChange}
          />
        </Col>
      </Row>

      <Row noGutters className="mt-2">
        <DatasetSelectorContainer>
          {!isBusy && (
            <DatasetSelectorList
              datasets={datasets}
              datasetHighlighted={datasetHighlighted}
              searchTerm={searchTerm}
              onDatasetHighlighted={setDatasetHighlighted}
            />
          )}

          {isBusy && <Spinner type="ThreeDots" size={20} color="#aaa" />}
        </DatasetSelectorContainer>
      </Row>

      <Row noGutters className="mt-2">
        <Col className="d-flex">
          {error && <p className="m-0 p-0 flex-1 text-danger">{error}</p>}
          <Button
            className={classNames('ml-auto', !datasetHighlighted && 'disabled')}
            type="button"
            color={datasetHighlighted ? 'primary' : 'secondary'}
            onClick={onNextClicked}
          >
            {t('Next')}
          </Button>
        </Col>
      </Row>
    </Container>
  )
}
