/* eslint-disable unicorn/consistent-function-scoping */
import React from 'react'

import { connect } from 'react-redux'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { Col, Row } from 'reactstrap'
import { defaultStyles, FileIcon } from 'react-file-icon'

import type { AlgorithmParams } from 'src/algorithms/types'
import type { State } from 'src/state/reducer'
import { setIsDirty } from 'src/state/algorithm/algorithm.actions'
import { FilePicker, TextContainer } from 'src/components/Main/FilePicker'
import { FileIconTxt } from 'src/components/Main/UploadZone'
import { SettingsDialog } from 'src/components/Settings/SettingsDialog'
import { selectCanExport, selectIsDirty, selectParams } from 'src/state/algorithm/algorithm.selectors'
import { CardL1, CardL1Body, CardL1Header } from 'src/components/Common/Card'
import { FileIconJson } from 'src/components/Main/FileIconJson'

export const FileIconContainer = styled.span`
  //flex: 0 0 50px;
  //margin: auto;
`

export const FileIconFasta = () => (
  <FileIconContainer className="mx-auto">
    <FileIcon
      {...defaultStyles.txt}
      extension="fasta"
      type="code2"
      labelColor={'#66b51d'}
      glyphColor={'#66b51d'}
      labelUppercase
    />
  </FileIconContainer>
)

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
