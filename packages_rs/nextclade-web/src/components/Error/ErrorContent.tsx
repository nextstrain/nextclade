/* eslint-disable react/destructuring-assignment */
import React, { useMemo } from 'react'
import { Col, Row } from 'reactstrap'

import { ErrorGeneric } from 'src/components/Error/error-types/ErrorGeneric'
import { ErrorNetworkConnectionFailure } from 'src/components/Error/error-types/ErrorNetworkConnectionFailure'
import { ErrorNetworkRequestFailure } from 'src/components/Error/error-types/ErrorNetworkRequestFailure'
import { sanitizeError } from 'src/helpers/sanitizeError'
import { HttpRequestError } from 'src/io/axiosFetch'
import { ErrorStack } from './ErrorStyles'

export function ErrorContentMessage({ error }: { error: Error }) {
  if (error instanceof HttpRequestError) {
    const url = error.request.url ?? 'Unknown URL'
    const status = error.response?.status
    if (!status) {
      return <ErrorNetworkConnectionFailure url={url} />
    }
    const statusText = error.response?.statusText ?? 'Unknown status'
    return <ErrorNetworkRequestFailure url={url} status={status} statusText={statusText} />
  }
  return <ErrorGeneric error={error} />
}

export function ErrorContentStack({ error }: { error: Error }) {
  const stackText = error?.stack?.replace(/webpack-internal:\/{3}\.\//g, '')?.replace(/https?:\/\/(.+):\d+\//g, '')
  if (!stackText) {
    return null
  }

  return <ErrorStack>{stackText}</ErrorStack>
}

export function ErrorContent(props: { error?: unknown }) {
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

        <Row noGutters>
          <Col>
            <ErrorContentStack error={error} />
          </Col>
        </Row>
      </Col>
    </Row>
  )
}
