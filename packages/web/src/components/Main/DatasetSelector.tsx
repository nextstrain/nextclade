import React, { useCallback, useState } from 'react'

import classNames from 'classnames'
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

const DatasetSelectorContainer = styled(Container)`
  width: 100%;
  height: 100%;
  padding: 0;
`

const DatasetSelectorTitle = styled.h3`
  flex: 1 1 100%;
`

const DatasetSelectorListContainer = styled.section`
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
    <DatasetSelectorContainer fluid>
      <Row noGutters>
        <Col sm={6}>
          <DatasetSelectorTitle>{t('Select a pathogen')}</DatasetSelectorTitle>
        </Col>

        <Col sm={6}>
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
        <DatasetSelectorListContainer>
          {!isBusy && (
            <DatasetSelectorList
              datasets={datasets}
              datasetHighlighted={datasetHighlighted}
              searchTerm={searchTerm}
              onDatasetHighlighted={setDatasetHighlighted}
            />
          )}

          {isBusy && <Spinner type="ThreeDots" size={20} color="#aaa" />}
        </DatasetSelectorListContainer>
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
    </DatasetSelectorContainer>
  )
}
