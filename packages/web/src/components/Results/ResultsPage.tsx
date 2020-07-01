import React from 'react'

import { Button, Card, CardBody, CardFooter, CardHeader, Col, Row } from 'reactstrap'
import { FaCaretLeft } from 'react-icons/fa'
import { useTranslation } from 'react-i18next'
import { connect } from 'react-redux'
import { goBack } from 'connected-next-router'

import type { State } from 'src/state/reducer'
import type { AlgorithmParams } from 'src/state/algorithm/algorithm.state'
import { setInput } from 'src/state/algorithm/algorithm.actions'

import { ResultsTable } from './ResultsTable'
import { ButtonExport } from './ButtonExport'
import { ResultsStatus } from './ResultsStatus'

export interface MainProps {
  params: AlgorithmParams
  setInput(input: string): void
  exportTrigger(_0?: unknown): void
  goBack(): void
}

const mapStateToProps = (state: State) => ({
  params: state.algorithm.params,
})

const mapDispatchToProps = {
  setInput,
  goBack: () => goBack(),
}

export const ResultsPage = connect(mapStateToProps, mapDispatchToProps)(ResultsPageDisconnected)

export function ResultsPageDisconnected({ params, setInput, goBack }: MainProps) {
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
            <ResultsStatus />
          </Col>
        </Row>

        <Row>
          <Col>
            <Card className="mt-1 mb-1">
              <CardHeader>{t('Results')}</CardHeader>

              <CardBody>
                <Row>
                  <Col>
                    <ResultsTable />
                  </Col>
                </Row>
              </CardBody>

              <CardFooter>
                <Row>
                  <Col className="d-flex w-100">
                    <div className="ml-auto">
                      <ButtonExport />
                    </div>
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
