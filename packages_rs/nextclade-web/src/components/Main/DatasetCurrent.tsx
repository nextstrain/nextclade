import React, { useCallback, useState } from 'react'

import { Button, Col, Collapse, Row } from 'reactstrap'
import { useRecoilValue, useResetRecoilState, useSetRecoilState } from 'recoil'
import { datasetCurrentAtom, datasetCurrentNameAtom } from 'src/state/dataset.state'
import styled from 'styled-components'

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
  const { t } = useTranslationSafe()
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const datasetCurrent = useRecoilValue(datasetCurrentAtom)
  const resetDatasetCurrent = useResetRecoilState(datasetCurrentNameAtom)

  const onChangeClicked = useCallback(() => {
    resetDatasetCurrent()
  }, [resetDatasetCurrent])

  const onCustomizeClicked = useCallback(() => setAdvancedOpen((advancedOpen) => !advancedOpen), [])

  if (!datasetCurrent) {
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
              <DatasetInfo dataset={datasetCurrent} />
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
            <ButtonCustomize isOpen={advancedOpen} onClick={onCustomizeClicked} />

            <Collapse isOpen={advancedOpen}>
              <AdvancedModeExplanationWrapper>
                <AdvancedModeExplanationContent />
              </AdvancedModeExplanationWrapper>

              <FilePickerAdvanced />
            </Collapse>
          </Col>
        </Row>
      </CurrentDatasetInfoBody>
    </CurrentDatasetInfoContainer>
  )
}
