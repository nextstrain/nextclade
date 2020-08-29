import React, { useState } from 'react'

import type { State } from 'src/state/reducer'
import { useTranslation } from 'react-i18next'
import { connect } from 'react-redux'
import { Button, Modal as ReactstrapModal, ModalBody, ModalFooter, ModalHeader } from 'reactstrap'
import styled from 'styled-components'
import { MdSettings } from 'react-icons/md'

import { resetQcRulesConfig } from 'src/state/settings/settings.actions'

import { SettingsDialog } from 'src/components/Settings/SettingsDialog'

export const ButtonStyled = styled(Button)`
  width: 150px;
  margin: 0 5px;
`

export const Modal = styled(ReactstrapModal)`
  min-width: 700px;
`

export interface SettingsButtonProps {
  resetQcRulesConfig(_0: unknown): void
}

const mapStateToProps = (state: State) => ({})

const mapDispatchToProps = {
  resetQcRulesConfig: () => resetQcRulesConfig(),
}

export const SettingsButton = connect(mapStateToProps, mapDispatchToProps)(SettingsButtonDisconnected)

export function SettingsButtonDisconnected({ resetQcRulesConfig }: SettingsButtonProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState<boolean>(true)

  function toggleOpen() {
    setIsOpen(!isOpen)
  }

  function open() {
    setIsOpen(true)
  }

  function close() {
    setIsOpen(false)
  }

  return (
    <>
      <ButtonStyled type="button" color="secondary" onClick={open} title={t(`Settings`)}>
        <MdSettings className="mr-2" />
        {t('Settings')}
      </ButtonStyled>

      <Modal centered isOpen={isOpen} toggle={toggleOpen} fade={false} size="lg">
        <ModalHeader toggle={close} tag="div">
          {t('QC Settings')}
        </ModalHeader>
        <ModalBody>
          <SettingsDialog />
        </ModalBody>
        <ModalFooter>
          <div className="mr-auto">
            <Button color="danger" onClick={resetQcRulesConfig}>
              {t('Reset to Defaults')}
            </Button>
          </div>

          <div className="ml-auto">
            <ButtonStyled type="button" color="success" onClick={close} title={t('Close this window')}>
              {t('OK')}
            </ButtonStyled>
          </div>
        </ModalFooter>
      </Modal>
    </>
  )
}
