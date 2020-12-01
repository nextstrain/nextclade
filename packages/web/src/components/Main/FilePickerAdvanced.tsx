import React from 'react'

import { connect } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { Col, Row } from 'reactstrap'
import { FilePicker } from 'src/components/Main/FilePicker'
import { FileIconFasta, FileIconJson, FileIconTxt } from 'src/components/Main/UploaderFileIcons'
import {
  algorithmRunAsync,
  removeFasta,
  removeGeneMap,
  removePcrPrimers,
  removeQcSettings,
  removeRootSeq,
  removeTree,
  setFasta,
  setGeneMap,
  setIsDirty,
  setPcrPrimers,
  setQcSettings,
  setRootSeq,
  setTree,
} from 'src/state/algorithm/algorithm.actions'
import { selectCanExport, selectIsDirty, selectParams } from 'src/state/algorithm/algorithm.selectors'
import { AlgorithmInput, AlgorithmParams } from 'src/state/algorithm/algorithm.state'

import { State } from 'src/state/reducer'
import { setShowNewRunPopup } from 'src/state/ui/ui.actions'

export interface FilePickerAdvancedProps {
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

  setShowNewRunPopup(showNewRunPopup: boolean): void
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
  setShowNewRunPopup,
}

export const FilePickerAdvanced = connect(mapStateToProps, mapDispatchToProps)(FilePickerAdvancedDisconnected)

export function FilePickerAdvancedDisconnected({
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
  setShowNewRunPopup,
}: FilePickerAdvancedProps) {
  const { t } = useTranslation()

  return (
    <Row noGutters>
      <Col>
        <FilePicker
          icon={<FileIconFasta />}
          text={t('Sequences')}
          canCollapse={false}
          defaultCollapsed={false}
          input={params.raw.seqData}
          errors={params.errors.seqData}
          onRemove={removeFasta}
          onInput={setFasta}
        />

        <FilePicker
          icon={<FileIconJson />}
          text={t('Reference tree')}
          input={params.raw.auspiceData}
          errors={params.errors.auspiceData}
          onRemove={removeTree}
          onInput={setTree}
        />

        <FilePicker
          icon={<FileIconTxt />}
          text={t('Root sequence')}
          input={params.raw.rootSeq}
          errors={params.errors.rootSeq}
          onRemove={removeRootSeq}
          onInput={setRootSeq}
        />

        <FilePicker
          icon={<FileIconJson />}
          text={t('Quality control')}
          input={params.raw.qcRulesConfig}
          errors={params.errors.qcRulesConfig}
          onRemove={removeQcSettings}
          onInput={setQcSettings}
        />

        <FilePicker
          icon={<FileIconJson />}
          text={t('Gene map')}
          input={params.raw.geneMap}
          errors={params.errors.geneMap}
          onRemove={removeGeneMap}
          onInput={setGeneMap}
        />

        <FilePicker
          icon={<FileIconJson />}
          text={t('PCR primers')}
          input={params.raw.pcrPrimers}
          errors={params.errors.pcrPrimers}
          onRemove={removePcrPrimers}
          onInput={setPcrPrimers}
        />
      </Col>
    </Row>
  )
}
