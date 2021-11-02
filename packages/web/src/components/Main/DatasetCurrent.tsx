import React, { useCallback, useMemo, useState } from 'react'

import { connect } from 'react-redux'
import { Button, Collapse } from 'reactstrap'

import { setCurrentDataset } from 'src/state/algorithm/algorithm.actions'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { selectCurrentDataset } from 'src/state/algorithm/algorithm.selectors'
import { FilePickerAdvanced } from 'src/components/FilePicker/FilePickerAdvanced'

import type { DatasetFlat } from 'src/algorithms/types'
import type { State } from 'src/state/reducer'
import styled from 'styled-components'
import { DatasetInfo } from './DatasetInfo'

export const CurrentDatasetInfoContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  margin-bottom: 1rem;
`

export const CurrentDatasetInfoHeader = styled.section`
  display: flex;
  margin-bottom: 0.5rem;
`

const DatasetInfoH4 = styled.h4`
  flex: 1;
  margin: auto 0;
`

export const CurrentDatasetInfoBody = styled.section`
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0.5rem;
  border: 1px #ccc9 solid;
  border-radius: 5px;
`

export const ChangeButton = styled(Button)`
  margin: auto 0;
  height: 2.1rem;
  min-width: 100px;
`

export const CustomizeButton = styled(Button)`
  height: 1.6rem;
  font-size: 0.85rem;
  padding: 0;
  margin-top: 5px;
  margin-bottom: 3px;
`

export interface DatasetCurrentProps {
  dataset?: DatasetFlat
  setCurrentDataset(dataset: DatasetFlat | undefined): void
}

const mapStateToProps = (state: State) => ({
  dataset: selectCurrentDataset(state),
})

const mapDispatchToProps = {
  setCurrentDataset,
}

export const DatasetCurrent = connect(mapStateToProps, mapDispatchToProps)(DatasetCurrentDisconnected)

export function DatasetCurrentDisconnected({ dataset, setCurrentDataset }: DatasetCurrentProps) {
  const { t } = useTranslationSafe()
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const onChangeClicked = useCallback(() => {
    setCurrentDataset(undefined)
  }, [setCurrentDataset])

  const onCustomizeClicked = useCallback(() => setAdvancedOpen((advancedOpen) => !advancedOpen), [])

  const customizeButtonText = useMemo(() => (advancedOpen ? t('Hide files') : t('Show files')), [advancedOpen, t])

  if (!dataset) {
    return null
  }

  return (
    <CurrentDatasetInfoContainer>
      <CurrentDatasetInfoHeader>
        <DatasetInfoH4>{t('Selected pathogen')}</DatasetInfoH4>
        <ChangeButton className="ml-auto" type="button" color="secondary" onClick={onChangeClicked}>
          {t('Change')}
        </ChangeButton>
      </CurrentDatasetInfoHeader>

      <CurrentDatasetInfoBody>
        <DatasetInfo dataset={dataset} />
        <div>
          <CustomizeButton type="button" color="link" onClick={onCustomizeClicked}>
            {customizeButtonText}
          </CustomizeButton>
        </div>
        <Collapse isOpen={advancedOpen}>
          <FilePickerAdvanced />
          <CustomizeButton type="button" color="link" onClick={onCustomizeClicked}>
            {customizeButtonText}
          </CustomizeButton>
        </Collapse>
      </CurrentDatasetInfoBody>
    </CurrentDatasetInfoContainer>
  )
}
