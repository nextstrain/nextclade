import React, { useCallback } from 'react'
import { useRouter } from 'next/router'
import { Button, ButtonProps, Modal, ModalBody, ModalFooter, ModalHeader as ReactstrapModalHeader } from 'reactstrap'
import { useRecoilValue, useResetRecoilState } from 'recoil'
import { useReloadPage } from 'src/hooks/useReloadPage'
import styled from 'styled-components'

import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { globalErrorAtom } from 'src/state/error.state'
import { ErrorContent } from './ErrorContent'
import { ErrorContentExplanation } from './ErrorContentExplanation'

export const ModalHeader = styled(ReactstrapModalHeader)`
  .modal-title {
    width: 100%;
  }
`

export const ButtonOk = styled(Button)<ButtonProps>`
  width: 100px;
  margin: 5px;
`

export function ErrorPopup() {
  const { t } = useTranslationSafe()
  const error = useRecoilValue(globalErrorAtom)
  const dismissError = useResetRecoilState(globalErrorAtom)

  const reload = useReloadPage('/')

  if (!error) {
    return null
  }

  return (
    <Modal centered isOpen backdrop="static" toggle={dismissError} fade={false} size="lg">
      <ModalHeader toggle={dismissError} tag="div">
        <h3 className="text-center text-danger">{t('Error')}</h3>
      </ModalHeader>

      <ModalBody>
        <ErrorContent error={error} />
        <ErrorContentExplanation />
      </ModalBody>

      <ModalFooter>
        <div className="ml-auto">
          <Button type="button" color="danger" title={t('Reload the page and start Nextclade fresh')} onClick={reload}>
            {t('Restart Nextclade')}
          </Button>
          <ButtonOk type="button" color="secondary" title={t('Close this dialog window')} onClick={dismissError}>
            {t('Dismiss')}
          </ButtonOk>
        </div>
      </ModalFooter>
    </Modal>
  )
}
