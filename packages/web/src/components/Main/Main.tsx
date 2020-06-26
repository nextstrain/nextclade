import React, { useCallback } from 'react'

import { Button, Card, CardBody, CardFooter, CardHeader, Col, Input, Row } from 'reactstrap'
import { MdFileDownload, MdRefresh } from 'react-icons/md'
import { useTranslation } from 'react-i18next'
import { connect } from 'react-redux'

import { Uploader } from 'src/components/Uploader/Uploader'

import type { State } from 'src/state/reducer'
import type { AlgorithmParams } from 'src/state/algorithm/algorithm.state'
import { AnylysisStatus } from 'src/state/algorithm/algorithm.state'
import { algorithmRunTrigger, exportTrigger, setInput } from 'src/state/algorithm/algorithm.actions'

import { ReactComponent as CladeSchema } from 'src/assets/img/Nextstrain_ncov_clades-20B1tip.svg'

import { Result } from './Result'

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
  const hangleInputChage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => { setInput(e.target.value) }, [setInput]) // prettier-ignore

  return (
    <Row noGutters>
      <Col>
        <Card className="mt-1 mb-1">
          <CardBody>
            <Row>
              <Col lg={4} className="pr-1">
                <Card>
                  <CardBody>
                    <figure>
                      <picture className="d-flex">
                        <CladeSchema height={300} />
                      </picture>
                      <figcaption>
                        <div>{t(`Illustration of phylogenetic relations ship of clades defined by nextstrain.`)}</div>
                        <div>{t(`Source: nexstrain.org`)}</div>
                      </figcaption>
                    </figure>
                  </CardBody>
                </Card>
              </Col>
              <Col lg={8} className="pl-1">
                <Card className="h-100">
                  <CardBody>
                    <h3>Nextstrain SARS-CoV-2 Clades</h3>
                    Since its emergence in late 2019, SARS-CoV-2 has diversified into several different co-circulating
                    variants. To facilitate discussion of these variants, we have grouped them into so called clades
                    which are defined by specific signature mutations. We currently define 5 major clades (see{' '}
                    <a href="https://nextstrain.org/blog/2020-06-02-SARSCoV2-clade-naming">
                      this blog post for details
                    </a>
                    )
                    <ul>
                      <li>19A and 19B emerged in Wuhan and have been dominating the early outbreak</li>
                      <li>
                        20A emerged from 19A out of dominated the European outbreak in March and has since spread
                        globally
                      </li>
                      <li>20B and 20C are large genetically distinct subclades 20A</li>
                    </ul>
                    <h4>Clade assignment</h4>
                    The analysis on <a href="https://nextstrain.org/ncov">nextstrain.org/ncov</a> uses the phylogenetic
                    context to assign clades. Here, we provide a simple tool to do this clade assignment
                    sequence-by-sequence through alignment to the reference. This is expected to be slightly less
                    sensitive, but will still give the correct answer in most cases. Sometimes, however, clade
                    assignment will fail. Importantly, these computations happen on your computer and{' '}
                    <b>your data does not leave your computer</b>.
                    <h4>Sequence QC</h4> In addition to assigning clades, the tool will scan your sequences for excess
                    divergence and clusters of differences from the reference. These might indicate problems during
                    sequencing or bioinformatic assembly and would result in these sequences being filtered out by
                    nextstrain.
                  </CardBody>
                </Card>
              </Col>
            </Row>
          </CardBody>
        </Card>

        <Card className="mt-1 mb-1">
          <CardHeader>{t('Sequence input')}</CardHeader>

          <CardBody>
            <Row>
              <Col>
                <Uploader onUpload={setInput} />
              </Col>
            </Row>

            <Row>
              <Col>
                <Input
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
              </Col>
            </Row>
          </CardBody>

          <CardFooter>
            <Row>
              <Col className="d-flex w-100">
                <Button className="ml-auto btn-refresh" color="success" onClick={algorithmRunTrigger}>
                  <MdRefresh className="btn-icon" />
                  <span>{t('Refresh')}</span>
                </Button>
              </Col>
            </Row>
          </CardFooter>
        </Card>

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
                <Button className="ml-auto btn-export" color="primary" disabled={!canExport} onClick={exportTrigger}>
                  <MdFileDownload className="btn-icon" />
                  <span>{t('Export')}</span>
                </Button>
              </Col>
            </Row>
          </CardFooter>
        </Card>
      </Col>
    </Row>
  )
}
