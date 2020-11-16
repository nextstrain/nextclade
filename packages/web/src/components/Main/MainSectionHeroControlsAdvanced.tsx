/* eslint-disable unicorn/consistent-function-scoping */
import React from 'react'

import { connect } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { Col, Row } from 'reactstrap'

import type { AlgorithmParams } from 'src/algorithms/types'
import type { State } from 'src/state/reducer'
import { setIsDirty } from 'src/state/algorithm/algorithm.actions'
import { selectCanExport, selectIsDirty, selectParams } from 'src/state/algorithm/algorithm.selectors'
import { FilePicker } from 'src/components/Main/FilePicker'
import { FileIconFasta, FileIconJson, FileIconTxt } from 'src/components/Main/UploaderFileIcons'

export interface MainSectionHeroControlsAdvancedProps {
  params: AlgorithmParams
  isDirty: boolean

  setIsDirty(isDirty: boolean): void
}

const mapStateToProps = (state: State) => ({
  params: selectParams(state),
  canExport: selectCanExport(state),
  isDirty: selectIsDirty(state),
  showInputBox: state.ui.showInputBox,
})

const mapDispatchToProps = {
  setIsDirty,
}

export const MainSectionHeroControlsAdvanced = connect(
  mapStateToProps,
  mapDispatchToProps,
)(MainSectionHeroControlsAdvancedDisconnected)

export function MainSectionHeroControlsAdvancedDisconnected({
  params,
  isDirty,
  setIsDirty,
}: MainSectionHeroControlsAdvancedProps) {
  const { t } = useTranslation()

  function onUploadFasta() {}

  function onUploadTree() {}

  function onUploadRootSeq() {}

  function onUploadQcSettings() {}

  function onUploadGeneMap() {}

  function onUploadPcrPrimers() {}

  return (
    <Row noGutters className="hero-content">
      <Col>
        <Row noGutters>
          <Col lg={4}>
            {/*
        <Row noGutters>
          <Col>
            <CardL1>
              <CardL1Header>
                <TextContainer>{t('Quality Control')}</TextContainer>
              </CardL1Header>

              <CardL1Body>
                <SettingsDialog />
              </CardL1Body>
            </CardL1>
          </Col>
        </Row>
        */}

            {/*
        <Row noGutters>
          <Col>
            <CardL1>
              <CardL1Header>
                <TextContainer>{t('Gene Map')}</TextContainer>
              </CardL1Header>

              <CardL1Body>
                <div style={{ width: '100%', height: '300px' }}>{t('Coming soon!')}</div>
              </CardL1Body>
            </CardL1>
          </Col>
        </Row>
        */}

            {/*
        <Row noGutters>
          <Col>
            <CardL1>
              <CardL1Header>
                <TextContainer>{t('PCR Primers')}</TextContainer>
              </CardL1Header>

              <CardL1Body>
                <div style={{ width: '100%', height: '300px' }}>{t('Coming soon!')}</div>
              </CardL1Body>
            </CardL1>
          </Col>
        </Row>
        */}
          </Col>

          <Col lg={8}>
            <FilePicker icon={<FileIconFasta />} text={t('Sequences')} onUpload={onUploadFasta} />

            <FilePicker icon={<FileIconJson />} text={t('Reference tree')} onUpload={onUploadTree} />

            <FilePicker icon={<FileIconTxt />} text={t('Root sequence')} onUpload={onUploadRootSeq} />

            <FilePicker icon={<FileIconJson />} text={t('Quality control')} onUpload={onUploadQcSettings} />

            <FilePicker icon={<FileIconJson />} text={t('Gene map')} onUpload={onUploadGeneMap} />

            <FilePicker icon={<FileIconJson />} text={t('PCR primers')} onUpload={onUploadPcrPrimers} />
          </Col>
        </Row>
      </Col>
    </Row>
  )
}
