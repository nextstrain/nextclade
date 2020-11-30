import React from 'react'

import { useTranslation } from 'react-i18next'
import { Button, ButtonProps, Modal, ModalBody, ModalFooter, ModalHeader as ReactstrapModalHeader } from 'reactstrap'
import { connect } from 'react-redux'
import { Li, Ul } from 'src/components/Common/List'
import { DOMAIN, PROJECT_NAME, URL_GITHUB_ISSUES, URL_GITHUB_ISSUES_FRIENDLY } from 'src/constants'
import styled from 'styled-components'
import { lighten } from 'polished'

import type { State } from 'src/state/reducer'
import { errorDismiss } from 'src/state/error/error.actions'
import { getHttpStatusText } from 'src/helpers/getHttpStatusText'
import { LinkExternal } from 'src/components/Link/LinkExternal'
import { HttpRequestError } from 'src/io/AlgorithmInput'

export const ModalHeader = styled(ReactstrapModalHeader)`
  color: ${(props) => props.theme.danger};
  background-color: ${(props) => lighten(0.45, props.theme.danger)};
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
`

export function GenericError({ error }: { error: Error }) {
  const { t } = useTranslation()

  return (
    <ErrorContainer>
      <h5>{t('Error: {{errorName}}', { errorName: error.name })}</h5>

      <section className="mt-3">
        <div>{error.message}</div>
      </section>
    </ErrorContainer>
  )
}

export function AxiosErrorDisconnected({ url }: { url: string }) {
  const { t } = useTranslation()

  return (
    <ErrorContainer>
      <h5>{t('Error: Network connection failed')}</h5>

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
      <h5>{t('Error: Network request failed')}</h5>

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

export function ErrorContent({ error }: { error: Error }) {
  if (error instanceof HttpRequestError) {
    const url = error.request.url ?? 'Unknown URL'
    const status = error.response?.status
    if (!status) {
      return <AxiosErrorDisconnected url={url} />
    }
    const statusText = error.response?.statusText ?? 'Unknown status'
    return <AxiosErrorFailed url={url} status={status} statusText={statusText} />
  }

  return <GenericError error={error} />
}

export interface ErrorPopupProps {
  error?: Error

  errorDismiss(): void
}

const mapStateToProps = (state: State) => ({
  error: state.error?.error,
})

const mapDispatchToProps = {
  errorDismiss: () => errorDismiss(),
}

export const ErrorPopup = connect(mapStateToProps, mapDispatchToProps)(ErrorPopupDisconnected)

export function ErrorPopupDisconnected({ error, errorDismiss }: ErrorPopupProps) {
  const { t } = useTranslation()

  if (error === undefined) {
    return null
  }

  return (
    <Modal centered isOpen backdrop="static" toggle={errorDismiss} fade={false} size="lg">
      <ModalHeader toggle={errorDismiss} tag="div">
        <h3>{t('Error')}</h3>
      </ModalHeader>
      {error?.message && (
        <ModalBody>
          <ErrorContent error={error} />
          <section className="mt-3">
            <div>
              {t('If you think it might be a bug in {{appName}}, please create a new issue at:', {
                appName: PROJECT_NAME,
              })}
            </div>
            <div>
              <LinkExternal href={URL_GITHUB_ISSUES}>{URL_GITHUB_ISSUES_FRIENDLY}</LinkExternal>
            </div>
            <div>{t('The developers will be happy to investigate this problem.')}</div>
          </section>
        </ModalBody>
      )}
      <ModalFooter>
        <div className="ml-auto">
          <ButtonOk type="button" color="secondary" onClick={errorDismiss}>
            {t('OK')}
          </ButtonOk>
        </div>
      </ModalFooter>
    </Modal>
  )
}
