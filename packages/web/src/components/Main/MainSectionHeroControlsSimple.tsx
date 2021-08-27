import React, { useCallback, useRef } from 'react'

import { delay } from 'lodash'
import { connect } from 'react-redux'
import { push } from 'connected-next-router'
import { useTranslation } from 'react-i18next'
import { Button, Col, Container, Row } from 'reactstrap'
import styled from 'styled-components'

import { FilePicker } from 'src/components/Main/FilePicker'

import type { State } from 'src/state/reducer'
import type { AlgorithmInput, AlgorithmParams } from 'src/state/algorithm/algorithm.state'
import {
  algorithmRunAsync,
  exportCsvTrigger,
  removeFasta,
  setFasta,
  setIsDirty,
} from 'src/state/algorithm/algorithm.actions'
import { selectCanDownload, selectParams } from 'src/state/algorithm/algorithm.selectors'
import { FileIconFasta } from './UploaderFileIcons'

export const FilePickerSimple = styled(FilePicker)`
  height: 100%;
`

export interface MainSectionHeroControlsProps {
  params: AlgorithmParams
  canExport: boolean

  setFasta(input: AlgorithmInput): void

  removeFasta(_0: unknown): void

  setIsDirty(isDirty: boolean): void

  algorithmRunAsyncTrigger(input: AlgorithmInput): void

  goToResults(): void
}

const mapStateToProps = (state: State) => ({
  params: selectParams(state),
  canExport: selectCanDownload(state),
})

const mapDispatchToProps = {
  setIsDirty,
  setFasta: setFasta.trigger,
  removeFasta,
  algorithmRunAsyncTrigger: algorithmRunAsync.trigger,
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
  algorithmRunAsyncTrigger,
  goToResults,
  setFasta,
  removeFasta,
}: MainSectionHeroControlsProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement | null>(null)

  const runExample = useCallback(() => {
    setIsDirty(true)
    inputRef?.current?.focus()
    delay(algorithmRunAsyncTrigger, 1000)
  }, [algorithmRunAsyncTrigger, setIsDirty])

  async function onUpload(input: AlgorithmInput) {
    setIsDirty(true)
    algorithmRunAsyncTrigger(input)
  }

  return (
    <Container fluid className="p-0">
      <Row noGutters>
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

      <Row noGutters>
        <Col>
          <Button color="link" onClick={runExample}>
            <small>{t('Show me an Example')}</small>
          </Button>
        </Col>
      </Row>
    </Container>
  )
}
