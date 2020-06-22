import React, { useCallback, useState, ChangeEvent, useEffect } from 'react'

import { noop } from 'lodash'

import { Button, Input, Row, Col, Card, CardBody, CardHeader, CardFooter } from 'reactstrap'
import { MdRefresh, MdFileDownload } from 'react-icons/md'
import { useTranslation } from 'react-i18next'
import type { DeepReadonly } from 'ts-essentials'

import { EXPORT_FILENAME } from 'src/constants'

import { Uploader } from 'src/components/Uploader/Uploader'
import { saveFile } from 'src/helpers/saveFile'

import type { AnalysisResult } from 'src/algorithms/types'
import { runInWorker } from 'src/algorithms/runInWorker'

import DEFAULT_INPUT from 'src/assets/data/defaultSequencesWithGaps.fasta'
import DEFAULT_ROOT_SEQUENCE from 'src/assets/data/defaultRootSequence.txt'

import { ReactComponent as CladeSchema } from 'src/assets/img/Nextstrain_ncov_clades-20B1tip.svg'

import { Result } from './Result'

export function Main() {
  const { t } = useTranslation()
  const [rootSeq] = useState(DEFAULT_ROOT_SEQUENCE)
  const [inputCurrent, setInputCurrent] = useState(DEFAULT_INPUT)
  const [result, setResult] = useState<DeepReadonly<AnalysisResult[]>>([])

  const hangleSequenceChage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setResult([])
    setInputCurrent(e.target.value)
  }, [])

  const handleRefresh = useCallback(noop, [])

  const handleUpload = useCallback((data: string) => {
    setResult([])
    setInputCurrent(data)
  }, [])

  const handleDownload = useCallback(() => {
    if (!result) {
      throw new Error('Unable to export: results are invalid')
    }

    const str = JSON.stringify(result, null, 2)
    saveFile(str, EXPORT_FILENAME)
  }, [result])

  const canDownload = !!result

  useEffect(() => {
    async function runEffect() {
      const result = await runInWorker({ input: inputCurrent, rootSeq })
      if (result.length > 0) {
        setResult(result)
      }
    }

    runEffect().catch(console.error)
  }, [inputCurrent, rootSeq])

  return (
    <Row noGutters>
      <Col>
        <Card className="mt-1 mb-1">
          <CardHeader>{t('Sequence input')}</CardHeader>

          <CardBody>
            <Row>
              <Col>
                <Uploader onUpload={handleUpload} />
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
                  value={inputCurrent}
                  onChange={hangleSequenceChage}
                />
              </Col>
            </Row>
          </CardBody>

          <CardFooter>
            <Row>
              <Col className="d-flex w-100">
                <Button className="ml-auto btn-refresh" color="success" onClick={handleRefresh}>
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
                <Result result={result} />
              </Col>
            </Row>
            <Row>
              <Col lg={4} className="pr-1">
                <Card>
                  <CardBody>
                    <figure>
                      <picture className="d-flex">
                        <CladeSchema height={200} />
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
                  <CardBody>{'Something here'}</CardBody>
                </Card>
              </Col>
            </Row>
          </CardBody>

          <CardFooter>
            <Row>
              <Col className="d-flex w-100">
                <Button className="ml-auto btn-export" color="primary" disabled={!canDownload} onClick={handleDownload}>
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
