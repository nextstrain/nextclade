/* eslint-disable unicorn/consistent-function-scoping */
import React from 'react'

import { connect } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { Button, Col, Row } from 'reactstrap'
import styled from 'styled-components'

import type { State } from 'src/state/reducer'
import type { AlgorithmInput, AlgorithmParams } from 'src/algorithms/types'
import {
  setIsDirty,
  setFasta,
  setGeneMap,
  setPcrPrimers,
  setQcSettings,
  setRootSeq,
  setTree,
  removeFasta,
  removePcrPrimers,
  removeTree,
  removeQcSettings,
  removeGeneMap,
  removeRootSeq,
} from 'src/state/algorithm/algorithm.actions'
import { selectCanExport, selectIsDirty, selectParams } from 'src/state/algorithm/algorithm.selectors'
import { ColFlexHorizontal, FilePicker } from 'src/components/Main/FilePicker'
import { FileIconFasta, FileIconJson, FileIconTxt } from 'src/components/Main/UploaderFileIcons'
import { PreviousResultsCard } from 'src/components/Main/PreviousResultsCard'
import { CardL1 as CardL1Base, CardL1Body as CardL1BodyBase } from 'src/components/Common/Card'

const ButtonsCardTop = styled(CardL1Base)`
  margin-top: 0;
`

const ButtonsCardBottom = styled(CardL1Base)`
  margin-bottom: 0;
`

const CardL1Body = styled(CardL1BodyBase)``

const ButtonRun = styled(Button)`
  min-height: 50px;
  min-width: 200px;
  margin-left: auto;
`

export interface MainSectionHeroControlsAdvancedProps {
  canRun: boolean
  params: AlgorithmParams
  isDirty: boolean

  setIsDirty(isDirty: boolean): void

  setFasta(input: AlgorithmInput): void

  setTree(input: AlgorithmInput): void

  setRootSeq(input: AlgorithmInput): void

  setQcSettings(input: AlgorithmInput): void

  setGeneMap(input: AlgorithmInput): void

  setPcrPrimers(input: AlgorithmInput): void

  removeFasta(_0: unknown): void

  removeTree(_0: unknown): void

  removeRootSeq(_0: unknown): void

  removeQcSettings(_0: unknown): void

  removeGeneMap(_0: unknown): void

  removePcrPrimers(_0: unknown): void
}

const mapStateToProps = (state: State) => ({
  canRun: state.algorithm.params.seqData !== undefined,
  params: selectParams(state),
  canExport: selectCanExport(state),
  isDirty: selectIsDirty(state),
})

const mapDispatchToProps = {
  setIsDirty,
  setFasta: setFasta.trigger,
  setTree: setTree.trigger,
  setRootSeq: setRootSeq.trigger,
  setQcSettings: setQcSettings.trigger,
  setGeneMap: setGeneMap.trigger,
  setPcrPrimers: setPcrPrimers.trigger,
  removeFasta,
  removeTree,
  removeRootSeq,
  removeQcSettings,
  removeGeneMap,
  removePcrPrimers,
}

export const MainSectionHeroControlsAdvanced = connect(
  mapStateToProps,
  mapDispatchToProps,
)(MainSectionHeroControlsAdvancedDisconnected)

export function MainSectionHeroControlsAdvancedDisconnected({
  canRun,
  params,
  isDirty,
  setIsDirty,
  setFasta,
  setTree,
  setRootSeq,
  setQcSettings,
  setGeneMap,
  setPcrPrimers,
  removeFasta,
  removeTree,
  removeRootSeq,
  removeQcSettings,
  removeGeneMap,
  removePcrPrimers,
}: MainSectionHeroControlsAdvancedProps) {
  const { t } = useTranslation()

  function onError() {}

  return (
    <Row noGutters className="hero-content">
      <Col>
        <Row noGutters>
          <Col lg={4}>
            <PreviousResultsCard />
          </Col>

          <Col lg={8}>
            <Row noGutters>
              <Col>
                <ButtonsCardTop>
                  <CardL1Body>
                    <Row noGutters>
                      <ColFlexHorizontal>
                        <ButtonRun disabled={!canRun} color={canRun ? 'success' : 'secondary'}>
                          {t('Run')}
                        </ButtonRun>
                      </ColFlexHorizontal>
                    </Row>
                  </CardL1Body>
                </ButtonsCardTop>
              </Col>
            </Row>

            <Row noGutters>
              <Col>
                <FilePicker
                  icon={<FileIconFasta />}
                  text={t('Sequences')}
                  canCollapse={false}
                  defaultCollapsed={false}
                  input={params.raw.seqData}
                  errors={params.errors.seqData}
                  onError={onError}
                  onRemove={removeFasta}
                  onInput={setFasta}
                />

                <FilePicker
                  icon={<FileIconJson />}
                  text={t('Reference tree')}
                  input={params.raw.auspiceData}
                  errors={params.errors.auspiceData}
                  onError={onError}
                  onRemove={removeTree}
                  onInput={setTree}
                />

                <FilePicker
                  icon={<FileIconTxt />}
                  text={t('Root sequence')}
                  input={params.raw.rootSeq}
                  errors={params.errors.rootSeq}
                  onError={onError}
                  onRemove={removeRootSeq}
                  onInput={setRootSeq}
                />

                <FilePicker
                  icon={<FileIconJson />}
                  text={t('Quality control')}
                  input={params.raw.qcRulesConfig}
                  errors={params.errors.qcRulesConfig}
                  onError={onError}
                  onRemove={removeQcSettings}
                  onInput={setQcSettings}
                />

                <FilePicker
                  icon={<FileIconJson />}
                  text={t('Gene map')}
                  input={params.raw.geneMap}
                  errors={params.errors.geneMap}
                  onError={onError}
                  onRemove={removeGeneMap}
                  onInput={setGeneMap}
                />

                <FilePicker
                  icon={<FileIconJson />}
                  text={t('PCR primers')}
                  input={params.raw.pcrPrimers}
                  errors={params.errors.pcrPrimers}
                  onError={onError}
                  onRemove={removePcrPrimers}
                  onInput={setPcrPrimers}
                />
              </Col>
            </Row>

            <Row noGutters>
              <Col>
                <ButtonsCardBottom>
                  <CardL1Body>
                    <Row noGutters>
                      <ColFlexHorizontal>
                        <ButtonRun disabled={!canRun} color={canRun ? 'success' : 'secondary'}>
                          {t('Run')}
                        </ButtonRun>
                      </ColFlexHorizontal>
                    </Row>
                  </CardL1Body>
                </ButtonsCardBottom>
              </Col>
            </Row>
          </Col>
        </Row>
      </Col>
    </Row>
  )
}
