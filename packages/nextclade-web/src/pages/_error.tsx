import React, { ErrorInfo, useMemo } from 'react'
import type { NextPageContext } from 'next'
import { Col, Container as ContainerBase, Row } from 'reactstrap'
import get from 'lodash/get'

import { ErrorContent } from 'src/components/Error/ErrorContent'
import { RestartButton } from 'src/components/Error/ErrorStyles'
import { Layout } from 'src/components/Layout/Layout'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { MainSectionTitle } from 'src/components/Main/MainSectionTitle'
import styled from 'styled-components'

export const Container = styled(ContainerBase)`
  max-height: 100vh;
  height: 100%;
  max-width: ${(props) => props.theme.xl};
  margin: 0 auto;
  display: flex;
  flex-direction: column;

  @media (max-width: 991.98px) {
    padding-left: 10px;
    padding-right: 10px;
  }

  @media (max-width: 767.98px) {
    padding-left: 5px;
    padding-right: 5px;
  }
`

export const MainContent = styled.main`
  margin: 0 auto;
  margin-top: 20px;
  height: 100%;
  max-width: 960px;
`

export interface ErrorPageProps {
  statusCode?: number
  title?: string
  error?: Error
  errorInfo?: ErrorInfo
}

function ErrorPage({ statusCode, title, error, errorInfo }: ErrorPageProps) {
  const { t } = useTranslationSafe()

  const titleText = useMemo(() => {
    const statusCodes: { [code: number]: string } = {
      400: t('Bad Request'),
      404: t('This page could not be found'),
      405: t('Method not allowed'),
      500: t('Internal server error'),
    }
    const statusText = get(statusCodes, statusCode ?? 0, undefined)
    return title ?? statusText ?? t('An unexpected error has occurred')
  }, [statusCode, t, title])

  const errorContent = useMemo(() => {
    if (!error) {
      return null
    }

    return (
      <Row noGutters>
        <Col>
          <ErrorContent error={error} errorInfo={errorInfo} detailed />
        </Col>
      </Row>
    )
  }, [error, errorInfo])

  return (
    <Layout>
      <MainContent>
        <MainSectionTitle />

        <Row noGutters>
          <Col className="text-center text-danger">
            <h2>{titleText}</h2>
          </Col>
        </Row>

        {errorContent}

        <Row noGutters>
          <Col className="w-100 d-flex">
            <RestartButton />
          </Col>
        </Row>
      </MainContent>
    </Layout>
  )
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext): Promise<ErrorPageProps> | ErrorPageProps => {
  const statusCode = res?.statusCode ?? err?.statusCode
  return { statusCode }
}

export default ErrorPage
