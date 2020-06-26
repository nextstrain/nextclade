import React, { useCallback, useState } from 'react'

import { Button, Card, CardBody, CardFooter, CardHeader, Col, Input, Row, Container } from 'reactstrap'
import { MdPlayArrow, MdCancel, MdClear } from 'react-icons/md'
import { useTranslation } from 'react-i18next'
import { connect } from 'react-redux'
import FileIcon, { defaultStyles } from 'react-file-icon'

import { Uploader } from 'src/components/Uploader/Uploader'

import type { State } from 'src/state/reducer'
import type { AlgorithmParams } from 'src/state/algorithm/algorithm.state'
import { AnylysisStatus } from 'src/state/algorithm/algorithm.state'
import { algorithmRunTrigger, exportTrigger, setInput } from 'src/state/algorithm/algorithm.actions'
import Link from '../Link/Link'

export interface MainProps {
  params: AlgorithmParams
  canExport: boolean
  setInput(input: string): void
  algorithmRunTrigger(_0?: unknown): void
  exportTrigger(_0?: unknown): void
}

const mapStateToProps = (state: State) => ({
  params: state.algorithm.params,
  canExport: state.algorithm.results.every((result) => result.status === AnylysisStatus.done),
})

const mapDispatchToProps = {
  setInput,
  algorithmRunTrigger: () => algorithmRunTrigger(),
  exportTrigger: () => exportTrigger(),
}

export const Main = connect(mapStateToProps, mapDispatchToProps)(MainDisconnected)

export function MainDisconnected({ params, canExport, setInput, algorithmRunTrigger, exportTrigger }: MainProps) {
  const { t } = useTranslation()
  const [showTextbox, setShowTextbox] = useState(false)
  const hangleInputChage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => { setInput(e.target.value) }, [setInput]) // prettier-ignore

  function loadDefaultData() {
    setInput()
  }

  return (
    <Row noGutters className="landing-page-row">
      <Col>
        <section className="pt-5 hero text-center">
          <Row className="mb-5">
            <Col>
              <h1 className="hero-h1">
                <strong>{t('Sequence Alignment & Clades in browser')}</strong>
              </h1>
              <h2 className="hero-h2">
                {t(
                  'Align SARS-CoV-2 sequences, control sequence quality and assign them to Nextstrain clades right in your browser.',
                )}
              </h2>
              <div>{t('Easy: no servers or complex pipelines')}</div>
              <div>{t('Private: no sequence data leaves your computer')}</div>
              <div>{t('Fast: algorithms use all available CPU cores on your machine')}</div>

              <p className="text-center">
                <Link href="/about">{t('How it works?')}</Link>
              </p>
            </Col>
          </Row>
        </section>

        <Card className="landing-controls">
          <CardBody>
            <Row>
              <Col>
                <Uploader onUpload={setInput} />
              </Col>
            </Row>

            <Row className="my-2" hidden={showTextbox}>
              <Col className="d-flex">
                <p className="mx-auto">{t('OR')}</p>
              </Col>
            </Row>

            <Row className="mb-2" hidden={showTextbox}>
              <Col className="d-flex">
                <Button className="mx-auto btn-select-file" onClick={() => setShowTextbox(true)}>
                  {t('Paste sequences')}
                </Button>
              </Col>
            </Row>

            <Row className="mb-2" hidden={!showTextbox}>
              <Col>
                <Card>
                  <CardHeader className="d-flex">
                    <div className="mr-auto">{t('Paste sequences')}</div>
                    <div className="ml-auto">
                      <button className="button-transparent" onClick={() => setShowTextbox(false)}>
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
                      rows={10}
                      value={params.input}
                      onChange={hangleInputChage}
                    />
                  </CardBody>
                </Card>
              </Col>
            </Row>

            <Row className="mb-2" hidden={!showTextbox}>
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
          </CardBody>
        </Card>
      </Col>
    </Row>
  )
}
