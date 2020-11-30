/* eslint-disable unicorn/consistent-function-scoping */
import React from 'react'

import { connect } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { Button, Col, Row } from 'reactstrap'
import styled from 'styled-components'

import type { State } from 'src/state/reducer'
import type { AlgorithmInput, AlgorithmParams } from 'src/state/algorithm/algorithm.state'
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
  algorithmRunAsync,
} from 'src/state/algorithm/algorithm.actions'
import { selectCanExport, selectIsDirty, selectParams } from 'src/state/algorithm/algorithm.selectors'
import { ColFlexHorizontal, FilePicker } from 'src/components/Main/FilePicker'
import { FileIconFasta, FileIconJson, FileIconTxt } from 'src/components/Main/UploaderFileIcons'

const RowButtonsAdvanced = styled(Row)`
  margin: 5px 7px;
`

const ButtonRunStyled = styled(Button)`
  min-height: 50px;
  min-width: 200px;
  margin-left: auto;
`

export function ButtonsAdvanced({ canRun, run }: { canRun: boolean; run(): void }) {
  const { t } = useTranslation()

  return (
    <RowButtonsAdvanced noGutters>
      <ColFlexHorizontal>
        <ButtonRunStyled disabled={!canRun} color={canRun ? 'success' : 'secondary'} onClick={run}>
          {t('Run')}
        </ButtonRunStyled>
      </ColFlexHorizontal>
    </RowButtonsAdvanced>
  )
}

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

  algorithmRunTrigger(_0: unknown): void
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
  algorithmRunTrigger: algorithmRunAsync.trigger,
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
  algorithmRunTrigger,
}: MainSectionHeroControlsAdvancedProps) {
  const { t } = useTranslation()
  const run = () => algorithmRunTrigger(undefined)

  function onError() {}

  return (
    <Row noGutters>
      <Col>
        <ButtonsAdvanced canRun={canRun} run={run} />

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

        <ButtonsAdvanced canRun={canRun} run={run} />
      </Col>
    </Row>
  )
}
