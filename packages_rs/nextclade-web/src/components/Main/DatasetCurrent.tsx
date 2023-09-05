import { isNil } from 'lodash'
import React, { useCallback, useMemo, useState } from 'react'
import { Button, Col, Collapse, Row, UncontrolledAlert } from 'reactstrap'
import { useRecoilState, useRecoilValue, useResetRecoilState, useSetRecoilState } from 'recoil'
import styled from 'styled-components'
import { useUpdatedDataset } from 'src/io/fetchDatasets'
import { datasetCurrentAtom, datasetUpdatedAtom } from 'src/state/dataset.state'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { ButtonCustomize } from 'src/components/Main/ButtonCustomize'
import { FilePickerAdvanced } from 'src/components/FilePicker/FilePickerAdvanced'
import { LinkExternal } from 'src/components/Link/LinkExternal'
import { DatasetInfo } from './DatasetInfo'
import AdvancedModeExplanationContent from './AdvancedModeExplanation.mdx'

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

export const AdvancedModeExplanationWrapper = styled.div`
  max-width: 550px;
  margin-top: 0.5rem;

  > p {
    margin: 0;
  }
`

export function DatasetCurrent() {
  // Periodically checks if there's local update for the current dataset
  useUpdatedDataset()

  const { t } = useTranslationSafe()
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const datasetCurrent = useRecoilValue(datasetCurrentAtom)
  const resetDatasetCurrent = useResetRecoilState(datasetCurrentAtom)

  const onChangeClicked = useCallback(() => {
    resetDatasetCurrent()
  }, [resetDatasetCurrent])

  const onCustomizeClicked = useCallback(() => setAdvancedOpen((advancedOpen) => !advancedOpen), [])

  const customize = useMemo(() => {
    if (datasetCurrent?.path === 'autodetect') {
      return null
    }

    return (
      <Row noGutters>
        <Col>
          <ButtonCustomize isOpen={advancedOpen} onClick={onCustomizeClicked} />

          <Collapse isOpen={advancedOpen}>
            <AdvancedModeExplanationWrapper>
              <AdvancedModeExplanationContent />
            </AdvancedModeExplanationWrapper>

            <FilePickerAdvanced />
          </Collapse>
        </Col>
      </Row>
    )
  }, [advancedOpen, datasetCurrent?.path, onCustomizeClicked])

  if (!datasetCurrent) {
    return null
  }

  return (
    <CurrentDatasetInfoContainer>
      <CurrentDatasetInfoHeader>
        <DatasetInfoH4>{t('Selected pathogen')}</DatasetInfoH4>
      </CurrentDatasetInfoHeader>

      <CurrentDatasetInfoBody>
        <DatasetCurrentUpdateNotification />

        <Row noGutters>
          <Col className="d-flex flex-row">
            <Left>
              <DatasetInfo dataset={datasetCurrent} />
            </Left>

            <Right>
              <ChangeButton type="button" color="secondary" onClick={onChangeClicked}>
                {t('Change')}
              </ChangeButton>
            </Right>
          </Col>
        </Row>

        {customize}
      </CurrentDatasetInfoBody>
    </CurrentDatasetInfoContainer>
  )
}

function DatasetCurrentUpdateNotification() {
  const { t } = useTranslationSafe()
  const [datasetUpdated, setDatasetUpdated] = useRecoilState(datasetUpdatedAtom)
  const setDatasetCurrent = useSetRecoilState(datasetCurrentAtom)

  const onDatasetUpdateClicked = useCallback(() => {
    setDatasetCurrent(datasetUpdated)
    setDatasetUpdated(undefined)
  }, [datasetUpdated, setDatasetCurrent, setDatasetUpdated])

  if (isNil(datasetUpdated)) {
    return null
  }

  return (
    <Row noGutters>
      <Col>
        <UncontrolledAlert closeClassName="d-none" fade={false} color="info" className="mx-1 py-2 px-2 d-flex w-100">
          <AlertTextWrapper>
            <p className="my-0">{t('A new version of this dataset is available.')}</p>
            <p className="my-0">
              <LinkExternal href="https://github.com/nextstrain/nextclade_data/blob/release/CHANGELOG.md">
                {"What's new?"}
              </LinkExternal>
            </p>
          </AlertTextWrapper>

          <AlertButtonWrapper>
            <ChangeButton
              type="button"
              color="info"
              title={t('Accept the updated dataset')}
              onClick={onDatasetUpdateClicked}
            >
              {t('Update')}
            </ChangeButton>
          </AlertButtonWrapper>
        </UncontrolledAlert>
      </Col>
    </Row>
  )
}

const AlertTextWrapper = styled.div`
  flex: 1;
`

const AlertButtonWrapper = styled.div`
  flex: 0;
`
