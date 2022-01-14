import React from 'react'

import { connect } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { Col, Row } from 'reactstrap'
import {
  algorithmRunAsync,
  removeGeneMap,
  removePcrPrimers,
  removeQcSettings,
  removeRootSeq,
  removeTree,
  removeVirusJson,
  setGeneMap,
  setIsDirty,
  setPcrPrimers,
  setQcSettings,
  setRootSeq,
  setTree,
  setVirusJson,
} from 'src/state/algorithm/algorithm.actions'
import { selectCanRun, selectIsDirty, selectParams } from 'src/state/algorithm/algorithm.selectors'
import { AlgorithmInput, AlgorithmParams } from 'src/state/algorithm/algorithm.state'

import { State } from 'src/state/reducer'
import { setShowNewRunPopup } from 'src/state/ui/ui.actions'
import { FileIconCsv, FileIconFasta, FileIconGff, FileIconJson } from '../Common/FileIcons'
import { FilePicker } from './FilePicker'

export interface FilePickerAdvancedProps {
  canRun: boolean
  params: AlgorithmParams
  isDirty: boolean
  algorithmRunTrigger(_0: unknown): void
  setIsDirty(isDirty: boolean): void
  setTree(input: AlgorithmInput): void
  setRootSeq(input: AlgorithmInput): void
  setQcSettings(input: AlgorithmInput): void
  setVirusJson(input: AlgorithmInput): void
  setGeneMap(input: AlgorithmInput): void
  setPcrPrimers(input: AlgorithmInput): void
  removeTree(_0: unknown): void
  removeRootSeq(_0: unknown): void
  removeQcSettings(_0: unknown): void
  removeVirusJson(_0: unknown): void
  removeGeneMap(_0: unknown): void
  removePcrPrimers(_0: unknown): void
  setShowNewRunPopup(showNewRunPopup: boolean): void
}

const mapStateToProps = (state: State) => ({
  canRun: selectCanRun(state),
  params: selectParams(state),
  isDirty: selectIsDirty(state),
})

const mapDispatchToProps = {
  setIsDirty,
  setTree: setTree.trigger,
  setRootSeq: setRootSeq.trigger,
  setQcSettings: setQcSettings.trigger,
  setVirusJson: setVirusJson.trigger,
  setGeneMap: setGeneMap.trigger,
  setPcrPrimers: setPcrPrimers.trigger,
  removeTree,
  removeRootSeq,
  removeQcSettings,
  removeVirusJson,
  removeGeneMap,
  removePcrPrimers,
  algorithmRunTrigger: algorithmRunAsync.trigger,
  setShowNewRunPopup,
}

export const FilePickerAdvanced = connect(mapStateToProps, mapDispatchToProps)(FilePickerAdvancedDisconnected)

export function FilePickerAdvancedDisconnected({
  params,
  setTree,
  setRootSeq,
  setQcSettings,
  setVirusJson,
  setGeneMap,
  setPcrPrimers,
  removeTree,
  removeRootSeq,
  removeQcSettings,
  removeVirusJson,
  removeGeneMap,
  removePcrPrimers,
}: FilePickerAdvancedProps) {
  const { t } = useTranslation()

  return (
    <Row noGutters>
      <Col>
        <FilePicker
          className="my-3"
          compact
          icon={<FileIconJson size={30} />}
          title={t('Reference tree')}
          exampleUrl="https://example.com/tree.json"
          pasteInstructions={t('Enter tree data in Auspice JSON v2 format')}
          input={params.raw.auspiceData}
          errors={params.errors.auspiceData}
          onRemove={removeTree}
          onInput={setTree}
        />

        <FilePicker
          className="my-3"
          compact
          icon={<FileIconFasta size={30} />}
          title={t('Root sequence')}
          exampleUrl="https://example.com/root_seq.fasta"
          pasteInstructions={t('Enter root sequence data in FASTA or plain text format')}
          input={params.raw.rootSeq}
          errors={params.errors.rootSeq}
          onRemove={removeRootSeq}
          onInput={setRootSeq}
        />

        <FilePicker
          className="my-3"
          compact
          icon={<FileIconJson size={30} />}
          title={t('Quality control')}
          exampleUrl="https://example.com/qc.json"
          pasteInstructions={t('Enter QC config in JSON format')}
          input={params.raw.qcRulesConfig}
          errors={params.errors.qcRulesConfig}
          onRemove={removeQcSettings}
          onInput={setQcSettings}
        />

        <FilePicker
          className="my-3"
          compact
          icon={<FileIconJson size={30} />}
          title={t('Virus attributes')}
          exampleUrl="https://example.com/virus.json"
          pasteInstructions={t('Enter Virus attributes in JSON format')}
          input={params.raw.virusJson}
          errors={params.errors.virusJson}
          onRemove={removeVirusJson}
          onInput={setVirusJson}
        />

        <FilePicker
          className="my-3"
          compact
          icon={<FileIconGff size={30} />}
          title={t('Gene map')}
          exampleUrl="https://example.com/gene_map.json"
          pasteInstructions={t('Enter gene map data in JSON format')}
          input={params.raw.geneMap}
          errors={params.errors.geneMap}
          onRemove={removeGeneMap}
          onInput={setGeneMap}
        />

        <FilePicker
          className="my-3"
          compact
          icon={<FileIconCsv size={30} />}
          title={t('PCR primers')}
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
