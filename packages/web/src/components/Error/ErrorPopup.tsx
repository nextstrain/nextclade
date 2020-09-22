import React from 'react'

import { useTranslation } from 'react-i18next'
import { Button, ButtonProps, Modal, ModalBody, ModalFooter, ModalHeader as ReactstrapModalHeader } from 'reactstrap'
import { connect } from 'react-redux'
import styled from 'styled-components'
import { lighten } from 'polished'

import type { State } from 'src/state/reducer'
import { HttpRequestError } from 'src/io/fetchInputsAndRunMaybe'
import { errorDismiss } from 'src/state/error/error.actions'
import { getHttpStatusText } from 'src/helpers/getHttpStatusText'
import { LinkExternal } from 'src/components/Link/LinkExternal'

export const ModalHeader = styled(ReactstrapModalHeader)`
  color: ${(props) => props.theme.danger};
  background-color: ${(props) => lighten(0.45, props.theme.danger)};
`

export const ButtonOk = styled(Button)<ButtonProps>`
  width: 100px;
`

export function GenericError({ error }: { error: Error }) {
  const { t } = useTranslation()

  return (
    <div>
      <h4>{t('Error')}</h4>
      <div>{error.message}</div>
    </div>
  )
}

export function AxiosErrorDisconnected({ url }: { url: string }) {
  const { t } = useTranslation()

  return (
    <div>
      <h5>{t('Request failed')}</h5>

      <div>{t('We tried to fetch data from')}</div>
      <div>
        <LinkExternal href={url}>{url}</LinkExternal>
      </div>
      <div>{t('but were unable to establish connection.')}</div>
      <div>{t('Please verify that the hostname is correct and that you are connected to internet')}</div>
    </div>
  )
}

export function AxiosErrorFailed({ url, status, statusText }: { url: string; status: number; statusText?: string }) {
  const { t } = useTranslation()

  const statusMessage = getHttpStatusText(t, status) ?? statusText

  return (
    <div>
      <h5>{t('Request failed')}</h5>

      <div>{t('We tried to fetch data from')}</div>
      <div>
        <LinkExternal href={url}>{url}</LinkExternal>
      </div>
      <div>{t('but received an error: {{statusMessage}}', { statusMessage })}</div>
    </div>
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
