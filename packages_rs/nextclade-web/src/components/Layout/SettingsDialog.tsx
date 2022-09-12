import React, { useMemo } from 'react'
import {
  Button,
  ButtonProps,
  Col,
  Container,
  FormGroup,
  Modal as ReactstrapModal,
  ModalBody as ReactstrapModalBody,
  ModalFooter as ReactstrapModalFooter,
  ModalHeader as ReactstrapModalHeader,
  Row,
} from 'reactstrap'
import { useRecoilState } from 'recoil'
import { CardL2, CardL2Body, CardL2Header } from 'src/components/Common/Card'
import { Toggle } from 'src/components/Common/Toggle'
import { SeqViewSettings } from 'src/components/Settings/SeqViewSettings'
import { SystemSettings } from 'src/components/Settings/SystemSettings'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { changelogShouldShowOnUpdatesAtom } from 'src/state/settings.state'
import styled from 'styled-components'

export const ButtonOk = styled(Button)<ButtonProps>`
  width: 100px;
`
export const ModalHeader = styled(ReactstrapModalHeader)`
  .modal-title {
    width: 100%;
  }
  padding: 1rem;
`
export const Modal = styled(ReactstrapModal)`
  @media (max-width: 1200px) {
    min-width: 50vw;
  }
`
export const ModalBody = styled(ReactstrapModalBody)`
  max-height: 66vh;
  min-height: 300px;

  padding: 1rem 0;

  overflow-y: auto;

  // prettier-ignore
  background:
    linear-gradient(#ffffff 33%, rgba(255,255,255, 0)),
    linear-gradient(rgba(255,255,255, 0), #ffffff 66%) 0 100%,
    radial-gradient(farthest-side at 50% 0, rgba(119,119,119, 0.5), rgba(0,0,0,0)),
    radial-gradient(farthest-side at 50% 100%, rgba(119,119,119, 0.5), rgba(0,0,0,0)) 0 100%;
  background-color: #ffffff;
  background-repeat: no-repeat;
  background-attachment: local, local, scroll, scroll;
  background-size: 100% 24px, 100% 24px, 100% 8px, 100% 8px;
`
export const ModalFooter = styled(ReactstrapModalFooter)`
  padding: 0;
`

export interface SettingsDialogProps {
  isOpen: boolean
  toggleOpen: () => void
}

export default function SettingsDialog({ isOpen, toggleOpen }: SettingsDialogProps) {
  const { t } = useTranslationSafe()
  const [showWhatsnewOnUpdate, setShowWhatsnewOnUpdate] = useRecoilState(changelogShouldShowOnUpdatesAtom)
  const text = useMemo(() => t('Settings'), [t])
  const closeText = useMemo(() => t('Close this window'), [t])

  return (
    <Modal backdrop="static" centered isOpen={isOpen} toggle={toggleOpen} fade={false}>
      <ModalHeader toggle={toggleOpen} tag="div">
        <h3 className="text-center">{text}</h3>
      </ModalHeader>

      <ModalBody>
        <Container>
          <Row>
            <Col>
              <CardL2>
                <CardL2Header>{t('System')}</CardL2Header>
                <CardL2Body>
                  <SystemSettings />
                </CardL2Body>
              </CardL2>
            </Col>
          </Row>
          <Row noGutters>
            <Col>
              <CardL2>
                <CardL2Header>{t('Sequence view markers')}</CardL2Header>
                <CardL2Body>
                  <SeqViewSettings />
                </CardL2Body>
              </CardL2>
            </Col>
          </Row>
          <Row noGutters>
            <Col>
              <CardL2>
                <CardL2Header>{t('Other settings')}</CardL2Header>
                <CardL2Body>
                  <FormGroup>
                    <Toggle
                      identifier={'settings-show-whatsnew-toggle'}
                      checked={showWhatsnewOnUpdate}
                      onCheckedChanged={setShowWhatsnewOnUpdate}
                    >
                      {t(`Show "What's new" dialog after each update`)}
                    </Toggle>
                  </FormGroup>
                </CardL2Body>
              </CardL2>
            </Col>
          </Row>
        </Container>
      </ModalBody>

      <ModalFooter>
        <Container fluid>
          <Row noGutters className="my-2">
            <Col className="d-flex w-100">
              <ButtonOk className="ml-auto" type="button" color="success" onClick={toggleOpen} title={closeText}>
                {t('OK')}
              </ButtonOk>
            </Col>
          </Row>
        </Container>
      </ModalFooter>
    </Modal>
  )
}
