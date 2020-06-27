import React, { useCallback, useRef } from 'react'

import { delay } from 'lodash'
import { Button, Card, CardBody, CardHeader, Col, Input, Row } from 'reactstrap'
import { MdPlayArrow, MdClear } from 'react-icons/md'
import { useTranslation } from 'react-i18next'
import { connect } from 'react-redux'

import About from 'src/components/About/About.mdx'
import { Uploader } from 'src/components/Uploader/Uploader'

import type { State } from 'src/state/reducer'
import type { AlgorithmParams } from 'src/state/algorithm/algorithm.state'
import { AnylysisStatus } from 'src/state/algorithm/algorithm.state'
import { algorithmRunTrigger, exportTrigger, setInput } from 'src/state/algorithm/algorithm.actions'
import { setShowInputBox } from 'src/state/ui/ui.actions'

export interface MainProps {
  params: AlgorithmParams
  canExport: boolean
  showInputBox: boolean
  setInput(input: string): void
  algorithmRunTrigger(): void
  exportTrigger(): void
  setShowInputBox(show: boolean): void
}

const mapStateToProps = (state: State) => ({
  params: state.algorithm.params,
  canExport: state.algorithm.results.every((result) => result.status === AnylysisStatus.done),
  showInputBox: state.ui.showInputBox,
})

const mapDispatchToProps = {
  setInput,
  algorithmRunTrigger: () => algorithmRunTrigger(),
  exportTrigger: () => exportTrigger(),
  setShowInputBox,
}

export const Main = connect(mapStateToProps, mapDispatchToProps)(MainDisconnected)

export function MainDisconnected({
  params,
  canExport,
  showInputBox,
  setInput,
  algorithmRunTrigger,
  exportTrigger,
  setShowInputBox,
}: MainProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const hangleInputChage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => { setInput(e.target.value) }, [setInput]) // prettier-ignore

  function loadDefaultData() {
    setShowInputBox(true)
    inputRef?.current?.focus()
    delay(setInput, 500, '')
  }

  return (
    <Row noGutters className="landing-page-row">
      <Col>
        <Row noGutters className="pt-5 hero-bg text-center">
          <Col>
            <h1 className="hero-h1 mt-2">
              <div className="font-weight-bold">{t('NextClade')}</div>
            </h1>
            <h2 className="hero-h2 mt-4">
              {t('Instant sequence alignment, clade assignment, quality control right inside your browser')}
            </h2>
          </Col>
        </Row>

        <div className="hero-content">
          <Row noGutters>
            <Col xl={6} className="px-4 hero-content-right">
              <Row noGutters className="mx-auto w-70 text-center">
                <Col className="mx-2 hero-feature-box hero-feature-box-top">
                  <h3 className="hero-h3">{t('Fast')}</h3>
                  <div className="small">
                    {t('Parallel processing, immediate feedback, faster research iterations')}
                  </div>
                </Col>

                <Col className="mx-2 hero-feature-box hero-feature-box-top">
                  <h3 className="hero-h3">{t('Simple')}</h3>
                  <div className="small">
                    {t('No complex tools or pipelines to setup - drop a file and see the results')}
                  </div>
                </Col>

                <Col className="mx-2 hero-feature-box hero-feature-box-top">
                  <h3 className="hero-h3 text-center">{t('Private')}</h3>
                  <div className="small">{t('No remote processing - sequencing data never leaves your computer')}</div>
                </Col>
              </Row>

              <Row noGutters className="mx-auto w-70 text-center my-4">
                <Col className="mx-2 hero-feature-box hero-feature-box-bottom">
                  <h3 className="hero-h3">{t('Sequence Alignment')}</h3>
                  <div className="small">
                    {t(
                      'Shift sequences with respect to the reference sequence, such that they can be compared and analyzed',
                    )}
                  </div>
                </Col>

                <Col className="mx-2 hero-feature-box hero-feature-box-bottom">
                  <h3 className="hero-h3">{t('Clade Assignment')}</h3>
                  <div className="small">{t('Deduce Nextstrain clades from features present in each sequence')}</div>
                </Col>

                <Col className="mx-2 hero-feature-box hero-feature-box-bottom">
                  <h3 className="hero-h3">{t('Quality Assesment')}</h3>
                  <div className="small">
                    {t('Check your data for common sequencing issues, inspect common attributes')}
                  </div>
                </Col>
              </Row>
            </Col>

            <Col xl={6} className="px-4 hero-content-left">
              <div className="hero-content-left-card">
                <Row>
                  <Col>
                    <Uploader onUpload={setInput} />
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
                        <div className="mr-auto">{t('Paste sequences')}</div>
                        <div className="ml-auto">
                          <button type="button" className="button-transparent" onClick={() => setShowInputBox(false)}>
                            <MdClear fill="white" />
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
                          onChange={hangleInputChage}
                          innerRef={inputRef}
                        />
                      </CardBody>
                    </Card>
                  </Col>
                </Row>

                <Row className="mb-2" hidden={!showInputBox}>
                  <Col className="d-flex w-100">
                    <Button className="mx-auto btn-refresh" color="success" onClick={algorithmRunTrigger}>
                      <MdPlayArrow className="btn-icon" />
                      <span>{t('Run')}</span>
                    </Button>
                  </Col>
                </Row>

                <Row>
                  <Col>
                    <Button color="link" onClick={loadDefaultData}>
                      <small>{t('May I have an Example?')}</small>
                    </Button>
                  </Col>
                </Row>
              </div>
            </Col>
          </Row>
        </div>

        <Row className="main-info-section">
          <Col>
            <About />
          </Col>
        </Row>
      </Col>
    </Row>
  )
}
