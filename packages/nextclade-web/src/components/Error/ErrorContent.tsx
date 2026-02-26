import React, { ErrorInfo, useCallback, useMemo, useState } from 'react'
import { Button, Col, Row } from 'reactstrap'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import styled from 'styled-components'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import { FaClipboardCheck, FaClipboardList } from 'react-icons/fa'
import { ErrorGeneric } from 'src/components/Error/error-types/ErrorGeneric'
import { ErrorNetworkConnectionFailure } from 'src/components/Error/error-types/ErrorNetworkConnectionFailure'
import { ErrorNetworkRequestFailure } from 'src/components/Error/error-types/ErrorNetworkRequestFailure'
import { NextcladeV2ErrorContent } from 'src/components/Error/error-types/NextcladeV2ErrorContent'
import { ErrorContentExplanation, getErrorReportText } from 'src/components/Error/ErrorContentExplanation'
import { sanitizeError } from 'src/helpers/sanitizeError'
import { NextcladeV2Error } from 'src/io/fetchSingleDatasetDirectory'
import { HttpRequestError } from 'src/io/axiosFetch'
import { ErrorMessageMonospace } from './ErrorStyles'

export const Summary = styled.summary`
  margin: 0;
  padding: 0.7rem;
  border: 1px #ccc9 solid;
  border-radius: 5px;
  background-color: ${(props) => props.theme.gray200};
`

export const Details = styled.details`
  font-weight: normal;
  margin: 0;
  padding: 0;
  border: 1px #ccc9 solid;
  border-radius: 5px;
  background-color: ${(props) => props.theme.gray100};
  transition: width linear 0.5s;
`

export const DetailsBody = styled.section`
  margin: 0;
  padding: 0 1rem;
`

export function ErrorContentMessage({ error }: { error: Error }) {
  if (error instanceof HttpRequestError) {
    const url = error.url ?? 'Unknown URL'
    const { status, statusText, message } = error

    if (!status || status === 'ERR_BAD_REQUEST') {
      return <ErrorNetworkConnectionFailure url={url} message={message} />
    }
    const text = message ?? statusText ?? 'Unknown status'
    return <ErrorNetworkRequestFailure url={url} status={status} statusText={text} message={message} />
  }

  if (error instanceof NextcladeV2Error) {
    return <NextcladeV2ErrorContent error={error} />
  }

  return <ErrorGeneric error={error} />
}

export function ErrorContent(props: { error?: unknown; errorInfo?: ErrorInfo; detailed?: boolean }) {
  const { t } = useTranslationSafe()
  const error = useMemo(() => sanitizeError(props.error), [props.error])

  if (!props.error) {
    return null
  }

  return (
    <Row noGutters>
      <Col>
        <Row noGutters>
          <Col>
            <ErrorContentMessage error={error} />
          </Col>
        </Row>

        {props.detailed && (
          <>
            <Row noGutters>
              <Col>
                <ErrorContentExplanation error={error} />
              </Col>
            </Row>

            <Row noGutters className="my-4">
              <Col>
                <Details>
                  <Summary className="d-flex">
                    <span className="my-auto">
                      {t('{{symbol}} Additional information for developers (click to expand)', { symbol: '>' })}
                    </span>
                    <span className="my-auto ml-auto">
                      <ButtonCopyToClipboard text={`\`\`\`\n${getErrorReportText(error).trim()}\n\`\`\``} />
                    </span>
                  </Summary>

                  <DetailsBody>
                    {getErrorReportText(error)
                      .split('\n\n')
                      .map((line) => (
                        <ErrorMessageMonospace key={line}>{line}</ErrorMessageMonospace>
                      ))}
                  </DetailsBody>
                </Details>
              </Col>
            </Row>
          </>
        )}
      </Col>
    </Row>
  )
}

const ButtonCopyToClipboardBase = styled(Button)`
  display: flex;
  width: 100px;
`

export function ButtonCopyToClipboard({ text }: { text: string }) {
  const { t } = useTranslationSafe()
  const [isCopied, setIsCopied] = useState(false)
  const setCopied = useCallback(() => {
    setIsCopied(true)
  }, [])
  return (
    <CopyToClipboard text={text} onCopy={setCopied}>
      <ButtonCopyToClipboardBase color={isCopied ? 'success' : 'primary'}>
        <span className="my-auto mr-auto">
          {isCopied ? <FaClipboardCheck size={15} /> : <FaClipboardList size={15} />}
        </span>
        <span className="my-auto mx-auto">{isCopied ? t('Copied!') : t('Copy')}</span>
      </ButtonCopyToClipboardBase>
    </CopyToClipboard>
  )
}
