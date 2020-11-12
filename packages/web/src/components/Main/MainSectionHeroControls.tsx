import React, { useCallback, useRef } from 'react'

import { delay } from 'lodash'
import { connect } from 'react-redux'
import { push } from 'connected-next-router'
import { useTranslation } from 'react-i18next'
import { Button, Card, CardBody, CardHeader, Col, Input, Row } from 'reactstrap'
import { FaCaretRight } from 'react-icons/fa'
import { MdClear, MdPlayArrow } from 'react-icons/md'

import { getSequenceDatum } from 'src/algorithms/defaults/viruses'
import { AlgorithmParams } from 'src/algorithms/types'
import { Uploader } from 'src/components/Main/Uploader'
import {
  algorithmRunAsync,
  exportCsvTrigger,
  setInput,
  setInputFile,
  setIsDirty,
} from 'src/state/algorithm/algorithm.actions'
import { selectCanExport, selectIsDirty, selectParams } from 'src/state/algorithm/algorithm.selectors'
import type { InputFile } from 'src/state/algorithm/algorithm.state'

import type { State } from 'src/state/reducer'
import { setShowInputBox } from 'src/state/ui/ui.actions'

export interface MainSectionHeroControlsProps {
  params: AlgorithmParams
  canExport: boolean
  showInputBox: boolean
  isDirty: boolean

  setInput(input: string): void

  setInputFile(inputFile: InputFile): void

  setIsDirty(isDirty: boolean): void

  algorithmRunTrigger(content?: string | File): void

  exportTrigger(): void

  setShowInputBox(show: boolean): void

  goToResults(): void
}

const mapStateToProps = (state: State) => ({
  params: selectParams(state),
  canExport: selectCanExport(state),
  isDirty: selectIsDirty(state),
  showInputBox: state.ui.showInputBox,
})

const mapDispatchToProps = {
  setInput,
  setInputFile: (inputFile: InputFile) => setInputFile(inputFile),
  setIsDirty,
  algorithmRunTrigger: (content?: string | File) => algorithmRunAsync.trigger(content),
  exportTrigger: () => exportCsvTrigger(),
  setShowInputBox,
  goToResults: () => push('/results'),
}

export const MainSectionHeroControls = connect(mapStateToProps, mapDispatchToProps)(MainSectionHeroControlsDisconnected)

export function MainSectionHeroControlsDisconnected({
  params,
  canExport,
  isDirty,
  showInputBox,
  setInput,
  setInputFile,
  setIsDirty,
  algorithmRunTrigger,
  exportTrigger,
  setShowInputBox,
  goToResults,
}: MainSectionHeroControlsProps) {
  const { t } = useTranslation()

  const inputRef = useRef<HTMLInputElement | null>(null)

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const data = e.target.value
      setIsDirty(true)
      setInput(data)
      setInputFile({ name: 'pasted.fasta', size: data.length })
    },
    [setInput, setInputFile, setIsDirty],
  )

  const handleRunButtonClick = useCallback(() => algorithmRunTrigger(), [algorithmRunTrigger])

  function loadDefaultData() {
    setIsDirty(true)
    setShowInputBox(true)
    inputRef?.current?.focus()
    const sequenceDatum = getSequenceDatum(params.virus.name)
    delay(setInput, 250, sequenceDatum)
    delay(setInputFile, 250, { name: 'example.fasta', size: sequenceDatum.length })
  }

  async function onUpload(file: File) {
    setIsDirty(true)
    algorithmRunTrigger(file)
  }

  const runButton = (
    <Button className="mx-auto btn-refresh" color="success" onClick={handleRunButtonClick}>
      <MdPlayArrow className="btn-icon" />
      <span>{t('Run')}</span>
    </Button>
  )

  const toResultsButton = (
    <Button className="mx-auto btn-refresh" color="primary" onClick={goToResults}>
      <span className="mr-2">{t('To Results')}</span>
      <FaCaretRight />
    </Button>
  )

  return (
    <Col xl={6} className="px-lg-4 hero-content-left">
      <div className="hero-content-left-card">
        <Row>
          <Col>
            <Uploader onUpload={onUpload} />
          </Col>
        </Row>

        <Row className="my-2" hidden={showInputBox}>
          <Col className="d-flex">
            <p className="mx-auto">{t('OR')}</p>
          </Col>
        </Row>

        <Row className="mb-2" hidden={showInputBox}>
          <Col className="d-flex">
            <Button className="mx-auto btn-select-file" onClick={() => setShowInputBox(true)}>
              {t('Paste sequences')}
            </Button>
          </Col>
        </Row>

        <Row className="mb-2" hidden={!showInputBox}>
          <Col>
            <Card>
              <CardHeader className="d-flex">
                <div className="mr-auto">{t('Paste or edit sequences')}</div>
                <div className="ml-auto">
                  <button type="button" className="button-transparent" onClick={() => setShowInputBox(false)}>
                    <MdClear />
                  </button>
                </div>
              </CardHeader>

              <CardBody className="p-0">
                <Input
                  className="sequence-input"
                  type="textarea"
                  data-gramm_editor="false"
                  wrap="off"
                  name="sequence-input"
                  id="sequence-input"
                  cols={80}
                  rows={20}
                  value={params.sequenceDatum}
                  onChange={handleInputChange}
                  innerRef={inputRef}
                />
              </CardBody>
            </Card>
          </Col>
        </Row>

        <Row className="mb-2" hidden={!showInputBox}>
          <Col className="d-flex w-100">{isDirty ? runButton : toResultsButton}</Col>
        </Row>

        <Row>
          <Col>
            <Button color="link" onClick={loadDefaultData}>
              <small>{t('Show me an Example')}</small>
            </Button>
          </Col>
        </Row>
      </div>
    </Col>
  )
}
