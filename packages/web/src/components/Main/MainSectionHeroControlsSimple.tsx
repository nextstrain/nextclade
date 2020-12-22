import React, { useRef } from 'react'

import { delay } from 'lodash'
import { connect } from 'react-redux'
import { push } from 'connected-next-router'
import { useTranslation } from 'react-i18next'
import { Button, Col, Row } from 'reactstrap'
import styled from 'styled-components'

import { getSequenceDatum } from 'src/algorithms/defaults/viruses'
import { FilePicker } from 'src/components/Main/FilePicker'

import type { State } from 'src/state/reducer'
import { AlgorithmInputString } from 'src/io/AlgorithmInput'
import type { AlgorithmInput, AlgorithmParams } from 'src/state/algorithm/algorithm.state'
import {
  algorithmRunWithSequencesAsync,
  exportCsvTrigger,
  removeFasta,
  removeResultsJson,
  setFasta,
  setIsDirty,
  setResultsJson,
  showResultsAsync,
} from 'src/state/algorithm/algorithm.actions'
import { selectCanExport, selectParams } from 'src/state/algorithm/algorithm.selectors'
import { FileIconFasta, FileIconJson } from './UploaderFileIcons'

export const FilePickerSimple = styled(FilePicker)`
  height: 100%;
`

export interface MainSectionHeroControlsProps {
  params: AlgorithmParams
  canExport: boolean

  setResultsJson(input: AlgorithmInput): void

  removeResultsJson(_0: unknown): void

  setFasta(input: AlgorithmInput): void

  removeFasta(_0: unknown): void

  setIsDirty(isDirty: boolean): void

  algorithmRunTrigger(_0: unknown): void

  algorithmRunWithSequencesTrigger(input: AlgorithmInput): void

  showResultsTrigger(input: AlgorithmInput): void

  goToResults(): void
}

const mapStateToProps = (state: State) => ({
  params: selectParams(state),
  canExport: selectCanExport(state),
})

const mapDispatchToProps = {
  setIsDirty,
  setFasta: setFasta.trigger,
  removeFasta,
  setResultsJson: setResultsJson.trigger,
  removeResultsJson,
  algorithmRunTrigger: algorithmRunWithSequencesAsync.trigger,
  algorithmRunWithSequencesTrigger: algorithmRunWithSequencesAsync.trigger,
  showResultsTrigger: showResultsAsync.trigger,
  exportTrigger: () => exportCsvTrigger(),
  goToResults: () => push('/results'),
}

export const MainSectionHeroControlsSimple = connect(
  mapStateToProps,
  mapDispatchToProps,
)(MainSectionHeroControlsDisconnected)

export function MainSectionHeroControlsDisconnected({
  params,
  canExport,
  setIsDirty,
  algorithmRunTrigger,
  algorithmRunWithSequencesTrigger,
  showResultsTrigger,
  goToResults,
  setFasta,
  removeFasta,
  setResultsJson,
  removeResultsJson,
}: MainSectionHeroControlsProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement | null>(null)

  function loadDefaultData() {
    setIsDirty(true)
    inputRef?.current?.focus()
    const seqData = getSequenceDatum(params.virus.name)
    setFasta(new AlgorithmInputString(seqData, t('Example sequences')))
    delay(algorithmRunWithSequencesTrigger, 250, new AlgorithmInputString(seqData, t('Example sequences')))
  }

  async function onUpload(input: AlgorithmInput) {
    setIsDirty(true)
    algorithmRunWithSequencesTrigger(input)
  }

  async function onResultsUpload(input: AlgorithmInput) {
    showResultsTrigger(input)
  }

  return (
    <div>
      <Row>
        <Col>
          <FilePickerSimple
            canCollapse={false}
            defaultCollapsed={false}
            icon={<FileIconFasta />}
            text={t('Sequences')}
            exampleUrl="https://example.com/sequences.fasta"
            pasteInstructions={t('Enter sequence data in FASTA or plain text format')}
            input={params.raw.seqData}
            onInput={onUpload}
            errors={params.errors.seqData}
            onRemove={removeFasta}
            inputRef={inputRef}
          />
        </Col>
      </Row>

      <Row>
        <Col>
          <FilePickerSimple
            canCollapse={false}
            defaultCollapsed={false}
            icon={<FileIconJson />}
            text={t('Results import')}
            exampleUrl="https://example.com/nextclade.json"
            pasteInstructions={t('Enter Nextclade results data in JSON format')}
            input={params.raw.resultsJson}
            onInput={onResultsUpload}
            errors={params.errors.resultsJson}
            onRemove={removeResultsJson}
          />
        </Col>
      </Row>

      <Row>
        <Col>
          <Button color="link" onClick={loadDefaultData}>
            <small>{t('Show me an Example')}</small>
          </Button>
        </Col>
      </Row>
    </div>
  )
}
