import React, { useState } from 'react'

import { useTranslation } from 'react-i18next'
import {
  Alert,
  Button,
  ButtonProps,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader as ReactstrapModalHeader,
} from 'reactstrap'
import { connect } from 'react-redux'
import serializeJavascript from 'serialize-javascript'
import styled from 'styled-components'
import { useRouter } from 'next/router'

import { DOMAIN, PROJECT_NAME, URL_GITHUB_ISSUES, URL_GITHUB_ISSUES_FRIENDLY } from 'src/constants'
import type { State } from 'src/state/reducer'
import { HttpRequestError } from 'src/io/axiosFetch'
import { Li, Ul } from 'src/components/Common/List'
import { errorDismiss } from 'src/state/error/error.actions'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { getHttpStatusText } from 'src/helpers/getHttpStatusText'
import { LinkExternal } from 'src/components/Link/LinkExternal'

export const ModalHeader = styled(ReactstrapModalHeader)`
  .modal-title {
    width: 100%;
  }
`

export const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;

  & a {
    overflow-wrap: anywhere;
  }
`

export const ButtonOk = styled(Button)<ButtonProps>`
  width: 100px;
  margin: 5px;
`

export const Message = styled.p`
  overflow-wrap: break-word;
  word-break: normal;
`

export function getErrorDetails(error: unknown): {
  name: string
  message: string
  stack?: string
} {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack }
  }
  if (typeof error === 'string') {
    return { name: 'Error', message: error }
  }
  return { name: 'Error', message: serializeJavascript(error) }
}

export function GenericError({ error }: { error: Error | string }) {
  const { t } = useTranslation()
  const { name, message, stack } = getErrorDetails(error)

  let errorText = t('An error has occurred: {{errorName}}', { errorName: name })
  if (name.toLowerCase().trim() === 'error') {
    errorText = t('An error has occurred.')
  }

  return (
    <ErrorContainer>
      <h5>{errorText}</h5>
      <Message>{message}</Message>
      {process.env.NODE_ENV === 'development' && stack && <p>{stack}</p>}
    </ErrorContainer>
  )
}

export function AxiosErrorDisconnected({ url }: { url: string }) {
  const { t } = useTranslation()

  return (
    <ErrorContainer>
      <h5>{t('An error has occurred: Network connection failed')}</h5>

      <section className="mt-3">
        <div>{t('We tried to download the file from')}</div>
        <div>
          <LinkExternal href={url}>{url}</LinkExternal>
        </div>
        <div>{t('but were unable to establish a connection.')}</div>
      </section>

      <section className="mt-3">
        {t('Please verify that:')}
        <Ul>
          <Li>{t('you are connected to the internet')}</Li>
          <Li>{t('the address to the file is correct')}</Li>
          <Li>{t('the address to the file is reachable from your browser')}</Li>
          <Li>
            {t('the are no browser extensions interfering with network requests')}
            <sup>1</sup>
          </Li>
          <Li>
            {t('the server allows Cross-Origin Resource Sharing (CORS)')}
            <sup>2</sup>
          </Li>
          <Li>
            {t('there are no problems in domain name resolution of your server')}
            <sup>3</sup>
          </Li>
        </Ul>

        <small>
          <div>
            <span>
              <sup className="mr-1">1</sup>
            </span>

            {t(
              'Some of the adblocking browser extensions (AdBlock, uBlock, Privacy Badger and others) and privacy-oriented browsers (such as Brave) are known to prevent {{appName}} from making network requests to other servers. ' +
                '{{appName}} respects your privacy, does not serve ads or collects personal data. ' +
                'All computation is done inside your browser. You can safely disable adblockers on {{domain}} and/or allow {{domain}} to make network requests to your data source server.',
              { appName: PROJECT_NAME, domain: DOMAIN },
            )}
          </div>
          <div>
            <span>
              <sup className="mr-1">2</sup>
            </span>
            <LinkExternal href="https://en.wikipedia.org/wiki/Cross-origin_resource_sharing">
              {'en.wikipedia.org/wiki/Cross-origin_resource_sharing'}
            </LinkExternal>
          </div>
          <div>
            <span>
              <sup className="mr-1">3</sup>
            </span>
            <LinkExternal href="https://en.wikipedia.org/wiki/Name_server">
              {'en.wikipedia.org/wiki/Name_server'}
            </LinkExternal>
          </div>
        </small>
      </section>
    </ErrorContainer>
  )
}

export function AxiosErrorFailed({ url, status, statusText }: { url: string; status: number; statusText?: string }) {
  const { t } = useTranslation()

  const statusMessage = getHttpStatusText(t, status) ?? statusText

  return (
    <ErrorContainer>
      <h5>{t('An error has occurred: Network request failed')}</h5>

      <section className="mt-3">
        <div>{t('We tried to download the file from')}</div>
        <div>
          <LinkExternal href={url}>{url}</LinkExternal>
        </div>
        <div>{t('and the connection was successful, but the remote server replied with the following error:')}</div>
        <div className="text-danger">{statusMessage}</div>
      </section>
    </ErrorContainer>
  )
}

export function BadAllocErrorMessage() {
  const { t } = useTranslation()
  return (
    <ErrorContainer>
      <h5>{t('An error has occurred: out of memory (std::bad_alloc).')}</h5>

      <section className="mt-3">
        <Alert color="danger" fade={false}>
          {t('Nextclade tried to allocate system memory, but no additional memory could be allocated.')}
        </Alert>
      </section>

      <section className="mt-3">
        <div>
          {t(
            'The Nextclade algorithm runs entirely locally in this Browser (and not on a remote server or in the cloud) and may thus require large amounts of local computational resources to perform calculations. Please make sure that there is enough system memory (RAM) available for Nextclade to operate.',
          )}
          <sup>1</sup>
        </div>
      </section>

      <section className="mt-3">
        {t('Possible solutions:')}
        <Ul>
          <Li>{t('Close unused web browser tabs, other applications and documents, to free up some memory.')}</Li>
          <Li>
            {t('Reduce number of processing threads in Nextclade\'s "Settings" dialog.')}
            <sup>2</sup>
          </Li>
          <Li>
            {t('Reduce the amount of analyzed data. For example, split large .fasta file to multiple smaller ones.')}
          </Li>
          <Li>
            {t('Consider updating your web browser. Nextclade runs best on the latest versions of {{ browserList }}')}
            <LinkExternal href="https://www.google.com/chrome">{t('Chrome')}</LinkExternal>
            {' and '}
            <LinkExternal href="https://www.mozilla.org/">{t('Firefox')}</LinkExternal>
            {'.'}
          </Li>
          <Li>
            {t(
              'Consider disabling ad blocking browser extensions or adding Nextclade to their exceptions list. These extensions may cause increased memory consumption and malfunctions in Nextclade.',
            )}
            <sup>3</sup>
          </Li>
          <Li>{t('Try to run Nextclade on another computer with more system memory, if available.')}</Li>
        </Ul>
      </section>

      <section className="mt-3">
        <p>
          <sup>1</sup>
          <small> {t('System memory (RAM) is not to be confused with disk storage .')}</small>
        </p>

        <p>
          <sup>2</sup>{' '}
          <small>
            {t(
              'Nextclade runs multiple algorithm instances in parallel, to take advantage of multiple CPU cores and threads on your computer. Each thread consumes a certain amount of memory. The more threads there is, the faster the analysis, and the more memory is needed. After reducing number of threads, Nextclade will run slower, but will consume less memory.',
            )}
          </small>
        </p>

        <p>
          <sup>3</sup>
          <small>{t('Nextclade respects user privacy, does not serve ads, and does not track its users.')}</small>
        </p>
      </section>
    </ErrorContainer>
  )
}

export function ErrorContent({ error }: { error: Error | string }) {
  if (error instanceof HttpRequestError) {
    const url = error.request.url ?? 'Unknown URL'
    const status = error.response?.status
    if (!status) {
      return <AxiosErrorDisconnected url={url} />
    }
    const statusText = error.response?.statusText ?? 'Unknown status'
    return <AxiosErrorFailed url={url} status={status} statusText={statusText} />
  }

  const { message } = getErrorDetails(error)

  if (message === 'std::bad_alloc') {
    return <BadAllocErrorMessage />
  }

  return <GenericError error={error} />
}

export interface ErrorPopupProps {
  globalError?: Error
  algorithmErrors: string[]

  errorDismiss(): void
}

const mapStateToProps = (state: State) => ({
  globalError: state.error?.error,
  algorithmErrors: state.algorithm.errors,
})

const mapDispatchToProps = {
  errorDismiss: () => errorDismiss(),
}

export const ErrorPopup = connect(mapStateToProps, mapDispatchToProps)(ErrorPopupDisconnected)

export function ErrorPopupDisconnected({ globalError, algorithmErrors, errorDismiss }: ErrorPopupProps) {
  const [shouldShutdown, setShouldShutdown] = useState<boolean>(false)
  const { t } = useTranslationSafe()
  const router = useRouter()

  if (shouldShutdown) {
    // trigger React suspense forever, to display loading spinner until the page is refreshed
    throw new Promise(() => {})
  }

  if (globalError === undefined && algorithmErrors.length === 0) {
    return null
  }

  const error = globalError ?? algorithmErrors[0]

  return (
    <Modal centered isOpen backdrop="static" toggle={errorDismiss} fade={false} size="lg">
      <ModalHeader toggle={errorDismiss} tag="div">
        <h3 className="text-center text-danger">{t('Error')}</h3>
      </ModalHeader>

      {error && (
        <ModalBody>
          <ErrorContent error={error} />
          <section className="mt-3">
            <div>
              {t('If you think it is a bug in {{appName}}, report it at', {
                appName: PROJECT_NAME,
              })}
            </div>
            <div>
              <LinkExternal href={URL_GITHUB_ISSUES}>{URL_GITHUB_ISSUES_FRIENDLY}</LinkExternal>
            </div>
            <div>
              {t(
                'so that developers can investigate this problem. Please provide as much details as possible about your input data, operating system, browser version and computer configuration. Include other details you deem useful for diagnostics. Share the example sequence data that allows to reproduce the problem, if possible.',
              )}
            </div>
          </section>
        </ModalBody>
      )}
      <ModalFooter>
        <div className="ml-auto">
          <Button
            type="button"
            color="danger"
            title={t('Reload the page and start Nextclade fresh')}
            onClick={() => {
              setShouldShutdown(true)
              router.reload()
            }}
          >
            {t('Restart Nextclade')}
          </Button>
          <ButtonOk type="button" color="secondary" title={t('Close this dialog window')} onClick={errorDismiss}>
            {t('Dismiss')}
          </ButtonOk>
        </div>
      </ModalFooter>
    </Modal>
  )
}
