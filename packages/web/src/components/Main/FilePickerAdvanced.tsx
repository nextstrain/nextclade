import React from 'react'

import { connect } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { Col, Row } from 'reactstrap'
import { FilePicker } from 'src/components/Main/FilePicker'
import { FileIconFasta, FileIconJson, FileIconCsv } from 'src/components/Main/UploaderFileIcons'
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
          exampleUrl="https://example.com/sequences.fasta"
          pasteInstructions={t('Enter sequence data in FASTA or plain text format')}
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
          exampleUrl="https://example.com/tree.json"
          pasteInstructions={t('Enter tree data in Auspice JSON v2 format')}
          input={params.raw.auspiceData}
          errors={params.errors.auspiceData}
          onRemove={removeTree}
          onInput={setTree}
        />

        <FilePicker
          icon={<FileIconFasta />}
          text={t('Root sequence')}
          exampleUrl="https://example.com/root_seq.fasta"
          pasteInstructions={t('Enter root sequence data in FASTA or plain text format')}
          input={params.raw.rootSeq}
          errors={params.errors.rootSeq}
          onRemove={removeRootSeq}
          onInput={setRootSeq}
        />

        <FilePicker
          icon={<FileIconJson />}
          text={t('Quality control')}
          exampleUrl="https://example.com/qc.json"
          pasteInstructions={t('Enter QC config in JSON format')}
          input={params.raw.qcRulesConfig}
          errors={params.errors.qcRulesConfig}
          onRemove={removeQcSettings}
          onInput={setQcSettings}
        />

        <FilePicker
          icon={<FileIconJson />}
          text={t('Gene map')}
          exampleUrl="https://example.com/gene_map.json"
          pasteInstructions={t('Enter gene map data in JSON format')}
          input={params.raw.geneMap}
          errors={params.errors.geneMap}
          onRemove={removeGeneMap}
          onInput={setGeneMap}
        />

        <FilePicker
          icon={<FileIconCsv />}
          text={t('PCR primers')}
          exampleUrl="https://example.com/pcr_primers.csv"
          pasteInstructions={t('Enter PCR primers data in CSV format')}
          input={params.raw.pcrPrimers}
          errors={params.errors.pcrPrimers}
          onRemove={removePcrPrimers}
          onInput={setPcrPrimers}
        />
      </Col>
    </Row>
  )
}
