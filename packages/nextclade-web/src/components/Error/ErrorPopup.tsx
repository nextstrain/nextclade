import React from 'react'
import { Button, ButtonProps, Modal, ModalBody, ModalFooter, ModalHeader as ReactstrapModalHeader } from 'reactstrap'
import { useRecoilValue, useResetRecoilState } from 'recoil'
import { RestartButton } from 'src/components/Error/ErrorStyles'
import styled from 'styled-components'

import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { globalErrorAtom } from 'src/state/error.state'
import { ErrorContent } from './ErrorContent'

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

  if (!error) {
    return null
  }

  return (
    <Modal centered isOpen backdrop="static" toggle={dismissError} fade={false} size="xl">
      <ModalHeader toggle={dismissError} tag="div">
        <h3 className="text-center text-danger">{t('Error')}</h3>
      </ModalHeader>

      <ModalBody>
        <ErrorContent error={error} detailed />
      </ModalBody>

      <ModalFooter>
        <div className="ml-auto">
          <RestartButton />
        </div>
      </ModalFooter>
    </Modal>
  )
}
