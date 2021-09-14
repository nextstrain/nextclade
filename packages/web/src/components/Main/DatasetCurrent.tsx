import React, { useCallback } from 'react'

import { connect } from 'react-redux'
import { Button } from 'reactstrap'

import { setCurrentDataset } from 'src/state/algorithm/algorithm.actions'
import { formatDateIsoUtcSimple } from 'src/helpers/formatDate'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { selectCurrentDataset } from 'src/state/algorithm/algorithm.selectors'

import type { DatasetFlat } from 'src/algorithms/types'
import type { State } from 'src/state/reducer'
import styled from 'styled-components'

export const CurrentDatasetInfoContainer = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 100%;
  height: 100%;
  margin-bottom: 2rem;
`

export const CurrentDatasetInfo = styled.section`
  display: flex;
  margin: 0;
  padding: 0.5rem;
  border: 1px #ccc9 solid;
  border-radius: 5px;
`

export const DatasetName = styled.h6`
  font-size: 1.3rem;
  font-weight: bold;
  padding: 0;
  margin: 0;
`

export interface DatasetCurrentProps {
  datasetCurrent?: DatasetFlat
  setCurrentDataset(dataset: DatasetFlat | undefined): void
}

const mapStateToProps = (state: State) => ({
  datasetCurrent: selectCurrentDataset(state),
})

const mapDispatchToProps = {
  setCurrentDataset,
}

export const DatasetCurrent = connect(mapStateToProps, mapDispatchToProps)(DatasetCurrentDisconnected)

export function DatasetCurrentDisconnected({ datasetCurrent, setCurrentDataset }: DatasetCurrentProps) {
  const { t } = useTranslationSafe()

  const onChangeClicked = useCallback(() => {
    setCurrentDataset(undefined)
  }, [setCurrentDataset])
  const onCustomizeClicked = useCallback(() => {}, [])

  if (!datasetCurrent) {
    return null
  }

  return (
    <CurrentDatasetInfoContainer>
      <h3>{t('Selected pathogen')}</h3>

      <CurrentDatasetInfo>
        <div>
          <DatasetName>{datasetCurrent.nameFriendly}</DatasetName>
          <div>{datasetCurrent.description}</div>
          <div className="small">
            {t('Reference: {{ ref }} ({{ source }}: {{ accession }})', {
              ref: datasetCurrent.reference.strainName,
              source: datasetCurrent.reference.source,
              accession: datasetCurrent.reference.accession,
            })}
          </div>
          <div className="small">{formatDateIsoUtcSimple(datasetCurrent.tag)}</div>
        </div>

        <div className="ml-auto">
          <Button className="mx-1" type="button" color="link" onClick={onCustomizeClicked}>
            {t('Customize')}
          </Button>
          <Button className="mx-1" type="button" onClick={onChangeClicked}>
            {t('Change')}
          </Button>
        </div>
      </CurrentDatasetInfo>
    </CurrentDatasetInfoContainer>
  )
}
