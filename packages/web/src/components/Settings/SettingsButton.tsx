import React, { useState } from 'react'

import type { State } from 'src/state/reducer'
import { useTranslation } from 'react-i18next'
import { connect } from 'react-redux'
import { Button, ButtonProps, Modal as ReactstrapModal, ModalBody, ModalFooter, ModalHeader } from 'reactstrap'
import styled from 'styled-components'
import { MdSettings } from 'react-icons/md'

import { resetQcRulesConfig } from 'src/state/settings/settings.actions'

import { SettingsDialog } from 'src/components/Settings/SettingsDialog'

export const ButtonSettingsBase = styled(Button)<ButtonProps>`
  margin: 2px 2px;
  height: 38px;
  width: 50px;
  color: ${(props) => props.theme.gray700};

  @media (min-width: 1200px) {
    width: 150px;
  }
`

export const ButtonOk = styled(Button)<ButtonProps>`
  width: 100px;
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
  const [isOpen, setIsOpen] = useState<boolean>(false)

  function toggleOpen() {
    setIsOpen(!isOpen)
  }

  function open() {
    setIsOpen(true)
  }

  function close() {
    setIsOpen(false)
  }

  const text = t('Settings')
  const closeText = t('Close this window')

  return (
    <>
      <ButtonSettingsBase type="button" onClick={open} title={text}>
        <MdSettings className="mr-xl-2" />
        <span className="d-none d-xl-inline">{text}</span>
      </ButtonSettingsBase>

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
            <ButtonOk type="button" color="success" onClick={close} title={closeText}>
              {t('OK')}
            </ButtonOk>
          </div>
        </ModalFooter>
      </Modal>
    </>
  )
}
