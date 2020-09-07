import React, { useCallback, useRef } from 'react'

import { delay } from 'lodash'
import { connect } from 'react-redux'
import { push } from 'connected-next-router'
import { Alert, Button, Card, CardBody, CardHeader, Col, Input, Row } from 'reactstrap'
import { MdClear, MdPlayArrow, MdWarning } from 'react-icons/md'
import { FaCaretRight } from 'react-icons/fa'
import { useTranslation } from 'react-i18next'

import { URL_GITHUB, URL_GITHUB_FRIENDLY } from 'src/constants'

import { LayoutMain } from 'src/components/Layout/LayoutMain'
import { About } from 'src/components/About/About'
import { Uploader } from 'src/components/Main/Uploader'

import type { State } from 'src/state/reducer'
import { selectCanExport, selectIsDirty } from 'src/state/algorithm/algorithm.selectors'
import type { AlgorithmParams, InputFile } from 'src/state/algorithm/algorithm.state'
import {
  algorithmRunAsync,
  exportCsvTrigger,
  setInput,
  setInputFile,
  setIsDirty,
} from 'src/state/algorithm/algorithm.actions'
import { setShowInputBox } from 'src/state/ui/ui.actions'
import { LinkExternal } from 'src/components/Link/LinkExternal'
import { Subtitle, Title } from 'src/components/Main/Title'

import DEFAULT_INPUT from 'src/assets/data/defaultSequencesWithGaps.fasta'

export interface MainProps {
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
  params: state.algorithm.params,
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

export const MainPage = connect(mapStateToProps, mapDispatchToProps)(MainDisconnected)

export function MainDisconnected({
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
}: MainProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setIsDirty(true)
      setInput(e.target.value)
      setInputFile({ name: 'input.fasta', size: DEFAULT_INPUT.length })
    },
    [setInput, setInputFile, setIsDirty],
  )

  const handleRunButtonClick = useCallback(() => algorithmRunTrigger(), [algorithmRunTrigger])

  function loadDefaultData() {
    setIsDirty(true)
    setShowInputBox(true)
    inputRef?.current?.focus()
    delay(setInput, 250, DEFAULT_INPUT)
    delay(setInputFile, 250, { name: 'input.fasta', size: DEFAULT_INPUT.length })
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
    <LayoutMain>
      <Row noGutters className="landing-page-row mx-auto">
        <Col>
          <Row noGutters className="hero-bg text-center mb-lg-5 mb-md-4 mb-sm-2">
            <Col>
              <Title />
              <Subtitle>{t('Clade assignment, mutation calling, and sequence quality checks')}</Subtitle>
            </Col>
          </Row>

          <Row noGutters className="hero-content">
            <Col xl={6} className="hero-content-right">
              <Row noGutters className="mx-auto text-center">
                <Col md={6} className="mb-2">
                  <div className="mx-1 hero-feature-box hero-feature-box-top">
                    <h3 className="hero-h3">{t('Simple')}</h3>
                    <div className="small">{t('No installation or setup - drop a file and see the results')}</div>
                  </div>
                </Col>

                <Col md={6} className="mb-2">
                  <div className="mx-1 hero-feature-box hero-feature-box-top">
                    <h3 className="hero-h3 text-center">{t('Private')}</h3>
                    <div className="small">{t('No remote processing - sequence data never leaves your computer')}</div>
                  </div>
                </Col>
              </Row>

              <Row noGutters className="text-center my-4">
                <Col md={3} className="mb-2">
                  <div className="mx-1 hero-feature-box hero-feature-box-bottom h-100">
                    <h3 className="hero-h3">{t('Mutation Calling')}</h3>
                    <div className="small">
                      {t('Find differences of your sequences relative to the reference in standard numbering')}
                    </div>
                  </div>
                </Col>

                <Col md={3} className="mb-2">
                  <div className="mx-1 hero-feature-box hero-feature-box-bottom h-100">
                    <h3 className="hero-h3">{t('Clade Assignment')}</h3>
                    <div className="small">{t('Find out which Nextstrain clades your samples are from')}</div>
                  </div>
                </Col>

                <Col md={3} className="mb-2">
                  <div className="mx-1 hero-feature-box hero-feature-box-bottom h-100">
                    <h3 className="hero-h3">{t('Phylogenetic Placement')}</h3>
                    <div className="small">{t('See where on the SARS-CoV-2 tree your sequences fall')}</div>
                  </div>
                </Col>

                <Col md={3} className="mb-2">
                  <div className="mx-1 hero-feature-box hero-feature-box-bottom h-100">
                    <h3 className="hero-h3">{t('Quality Control')}</h3>
                    <div className="small">{t('Check your data against multiple QC metrics')}</div>
                  </div>
                </Col>
              </Row>
            </Col>

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
                          value={params.input}
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
          </Row>

          <Row noGutters className="mt-3 main-info-section">
            <Col>
              <Row noGutters>
                <Col className="text-center">
                  <Alert color="warning" fade={false} className="d-inline-flex mx-auto main-dev-alert">
                    <Row>
                      <Col lg={2} md={3} sm={2} className="my-auto">
                        <MdWarning size={45} />
                      </Col>
                      <Col className="small text-left over">
                        {t(
                          'Nextclade is currently under active development. ' +
                            'Implementation details and data formats are subjects to change. ' +
                            'The app may contain bugs. Please report any issues and leave feedback at {{githubURL}}',
                          { githubURL: '' },
                        )}
                        <LinkExternal href={URL_GITHUB}>{URL_GITHUB_FRIENDLY}</LinkExternal>
                      </Col>
                    </Row>
                  </Alert>
                </Col>
              </Row>

              <Row noGutters className="mt-3 mx-auto">
                <Col>
                  <About />
                </Col>
              </Row>
            </Col>
          </Row>
        </Col>
      </Row>
    </LayoutMain>
  )
}
