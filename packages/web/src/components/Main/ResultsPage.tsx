import React from 'react'

import { Button, Card, CardBody, CardFooter, CardHeader, Col, Row } from 'reactstrap'
import { MdFileDownload } from 'react-icons/md'
import { FaCaretLeft } from 'react-icons/fa'
import { useTranslation } from 'react-i18next'
import { connect } from 'react-redux'
import { goBack } from 'connected-next-router'

import type { State } from 'src/state/reducer'
import type { AlgorithmParams } from 'src/state/algorithm/algorithm.state'
import { AnylysisStatus } from 'src/state/algorithm/algorithm.state'
import { algorithmRunTrigger, exportTrigger, setInput } from 'src/state/algorithm/algorithm.actions'

import { Result } from './Result'

export interface MainProps {
  params: AlgorithmParams
  canExport: boolean
  setInput(input: string): void
  algorithmRunTrigger(_0?: unknown): void
  exportTrigger(_0?: unknown): void
  goBack(): void
}

const mapStateToProps = (state: State) => ({
  params: state.algorithm.params,
  canExport: state.algorithm.results.every((result) => result.status === AnylysisStatus.done),
})

const mapDispatchToProps = {
  setInput,
  algorithmRunTrigger: () => algorithmRunTrigger(),
  exportTrigger: () => exportTrigger(),
  goBack: () => goBack(),
}

export const ResultsPage = connect(mapStateToProps, mapDispatchToProps)(ResultsPageDisconnected)

export function ResultsPageDisconnected({
  params,
  canExport,
  setInput,
  algorithmRunTrigger,
  exportTrigger,
  goBack,
}: MainProps) {
  const { t } = useTranslation()

  return (
    <Row noGutters>
      <Col>
        <Row>
          <Col className="d-flex">
            <div className="mr-auto">
              <Button color="secondary" className="results-btn-back" onClick={goBack}>
                <FaCaretLeft />
                {t('Back')}
              </Button>
            </div>
          </Col>
        </Row>

        <Row>
          <Col>
            <Card className="mt-1 mb-1">
              <CardHeader>{t('Results')}</CardHeader>

              <CardBody>
                <Row>
                  <Col>
                    <Result />
                  </Col>
                </Row>
              </CardBody>

              <CardFooter>
                <Row>
                  <Col className="d-flex w-100">
                    <Button
                      className="ml-auto btn-export"
                      color="primary"
                      disabled={!canExport}
                      onClick={exportTrigger}
                    >
                      <MdFileDownload className="btn-icon" />
                      <span>{t('Export')}</span>
                    </Button>
                  </Col>
                </Row>
              </CardFooter>
            </Card>
          </Col>
        </Row>
      </Col>
    </Row>
  )
}
