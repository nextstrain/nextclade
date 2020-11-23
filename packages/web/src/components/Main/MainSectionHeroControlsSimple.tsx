import React, { useCallback, useRef } from 'react'

import { delay } from 'lodash'
import { connect } from 'react-redux'
import { push } from 'connected-next-router'
import { useTranslation } from 'react-i18next'
import { Button, Card, CardBody, CardHeader, Col, Input, Row } from 'reactstrap'
import styled from 'styled-components'
import { FaCaretRight } from 'react-icons/fa'
import { MdClear, MdPlayArrow } from 'react-icons/md'

import { getSequenceDatum } from 'src/algorithms/defaults/viruses'
import { AlgorithmParams } from 'src/algorithms/types'
import { FilePicker } from 'src/components/Main/FilePicker'
import { MainSectionHeroFeatures } from 'src/components/Main/MainSectionHeroFeatures'
import { Uploader } from 'src/components/Main/Uploader'
import {
  algorithmRunAsync,
  exportCsvTrigger,
  setInput,
  setInputFile,
  setIsDirty,
} from 'src/state/algorithm/algorithm.actions'
import { selectCanExport, selectIsDirty, selectParams } from 'src/state/algorithm/algorithm.selectors'
import type { FileStats } from 'src/state/algorithm/algorithm.state'

import type { State } from 'src/state/reducer'
import { setShowInputBox } from 'src/state/ui/ui.actions'
import { FileIconFasta } from './UploaderFileIcons'

export const FilePickerSimple = styled(FilePicker)`
  height: 100%;
`

export interface MainSectionHeroControlsProps {
  params: AlgorithmParams
  canExport: boolean
  showInputBox: boolean
  isDirty: boolean

  setInput(input: string): void

  setInputFile(inputFile: FileStats): void

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
  setInputFile: (inputFile: FileStats) => setInputFile(inputFile),
  setIsDirty,
  algorithmRunTrigger: (content?: string | File) => algorithmRunAsync.trigger(content),
  exportTrigger: () => exportCsvTrigger(),
  setShowInputBox,
  goToResults: () => push('/results'),
}

export const MainSectionHeroControlsSimple = connect(
  mapStateToProps,
  mapDispatchToProps,
)(MainSectionHeroControlsDisconnected)

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

  return (
    <Row noGutters className="hero-content">
      <Col xl={6} className="px-lg-4 hero-content-left">
        <MainSectionHeroFeatures />
      </Col>

      <Col xl={6} className="hero-content-right">
        <div className="hero-content-left-card">
          <Row>
            <Col>
              <FilePickerSimple
                canCollapse={false}
                defaultCollapsed={false}
                icon={<FileIconFasta />}
                text={t('Sequences')}
                onUpload={onUpload}
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
      </Col>
    </Row>
  )
}
