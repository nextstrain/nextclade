import React, { useCallback, useMemo, useState } from 'react'

import { connect } from 'react-redux'
import { Button, Col, Collapse, Row } from 'reactstrap'
import { LinkExternal } from 'src/components/Link/LinkExternal'

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
  padding: 12px;
  border: 1px #ccc9 solid;
  border-radius: 5px;
  height: 100%;
`

export const Left = styled.section`
  flex: 1 1 auto;
  display: flex;
`

export const Right = styled.section`
  flex: 0 0 250px;
  display: flex;
  flex-direction: column;
  height: 100%;
`

export const ChangeButton = styled(Button)`
  flex: 0 0 auto;
  height: 2.1rem;
  min-width: 100px;
  margin-left: auto;
`

export const CustomizeButton = styled(Button)`
  height: 1.6rem;
  font-size: 0.85rem;
  padding: 0;
  margin: 0;
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

  const customizeButtonText = useMemo(() => (advancedOpen ? t('Hide dataset files') : t('Show dataset files')), [
    advancedOpen,
    t,
  ])

  if (!dataset) {
    return null
  }

  return (
    <CurrentDatasetInfoContainer>
      <CurrentDatasetInfoHeader>
        <DatasetInfoH4>{t('Selected pathogen')}</DatasetInfoH4>
      </CurrentDatasetInfoHeader>

      <CurrentDatasetInfoBody>
        <Row noGutters>
          <Col className="d-flex flex-row">
            <Left>
              <DatasetInfo dataset={dataset} />
            </Left>

            <Right>
              <ChangeButton type="button" color="secondary" onClick={onChangeClicked}>
                {t('Change')}
              </ChangeButton>
              <LinkExternal
                className="ml-auto mt-auto"
                href="https://github.com/nextstrain/nextclade_data/blob/master/CHANGELOG.md"
              >
                <small>{t('Recent dataset updates')}</small>
              </LinkExternal>
            </Right>
          </Col>
        </Row>

        <Row noGutters>
          <Col>
            <CustomizeButton type="button" color="link" onClick={onCustomizeClicked}>
              {customizeButtonText}
            </CustomizeButton>

            <Collapse isOpen={advancedOpen}>
              <FilePickerAdvanced />
              <CustomizeButton className="mt-2" type="button" color="link" onClick={onCustomizeClicked}>
                {customizeButtonText}
              </CustomizeButton>
            </Collapse>
          </Col>
        </Row>
      </CurrentDatasetInfoBody>
    </CurrentDatasetInfoContainer>
  )
}
