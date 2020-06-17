import React, { useCallback, useState, ChangeEvent, useEffect } from 'react'

import { noop } from 'lodash'

import { Button, Input, Row, Col, Card, CardBody, CardHeader, CardFooter } from 'reactstrap'
import { MdRefresh, MdFileDownload } from 'react-icons/md'
import { useTranslation } from 'react-i18next'

import { EXPORT_FILENAME } from 'src/constants'

import { Uploader } from 'src/components/Uploader/Uploader'
import { saveFile } from 'src/helpers/saveFile'

import { AnalyzeSeqResult } from 'src/algorithms/run'
import { runInWorker } from 'src/algorithms/runInWorker'

import DEFAULT_INPUT from 'src/assets/data/defaultSequences.fasta'
import DEFAULT_ROOT_SEQUENCE from 'src/assets/data/defaultRootSequence.txt'

import { Result } from './Result'

export function Main() {
  const { t } = useTranslation()
  const [inputCurrent, setInputCurrent] = useState(DEFAULT_INPUT)
  const [result, setResult] = useState<AnalyzeSeqResult[]>([])

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
      const { result } = await runInWorker({ input: inputCurrent, rootSeq: DEFAULT_ROOT_SEQUENCE })
      if (result.length > 0) {
        setResult(result)
      }
    }

    runEffect().catch(console.error)
  }, [inputCurrent])

  return (
    <Row noGutters>
      <Col>
        <Card className="mt-1 mb-1">
          <CardHeader>{t('Sequence')}</CardHeader>

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
          <CardHeader>{t('Clades')}</CardHeader>

          <CardBody>
            <Row>
              <Col>
                <Result result={result} />
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
