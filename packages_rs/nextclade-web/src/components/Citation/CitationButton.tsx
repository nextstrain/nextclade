import React, { useCallback, useState } from 'react'
import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'
import {
  Button,
  ButtonProps,
  Col,
  Container,
  Modal as ReactstrapModal,
  ModalBody as ReactstrapModalBody,
  ModalFooter as ReactstrapModalFooter,
  ModalHeader as ReactstrapModalHeader,
  Row,
} from 'reactstrap'
import styled from 'styled-components'
import { Citation } from 'src/components/Citation/Citation'

export const ButtonCitationBase = styled(Button)<ButtonProps>`
  color: ${(props) => props.theme.bodyColor};
  padding: 0;
  background-color: transparent;
  background-image: none;
  border: none;
  border-radius: 0;
  box-shadow: none;
  border-image: none;
  text-decoration: none;
  -webkit-tap-highlight-color: #ccc;

  & .active,
  & :active,
  & :hover,
  & :target,
  & :focus,
  & :focus-visible,
  & :focus-within {
    background-color: transparent;
    background-image: none;
    border: none;
    border-radius: 0;
    box-shadow: none;
    border-image: none;
  }
`

export const ButtonOk = styled(Button)<ButtonProps>`
  width: 100px;
`

export const ModalHeader = styled(ReactstrapModalHeader)`
  .modal-title {
    width: 100%;
  }

  @media (max-width: 992px) {
    padding: 0.25rem;
    margin: 0.5rem;
    margin-bottom: 0;
  }
`

export const Modal = styled(ReactstrapModal)`
  height: 100%;

  // fullscreen on mobile
  @media (max-width: 992px) {
    max-width: unset;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    margin: 0;
    padding: 0;

    .modal-content {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      margin: 0;
    }
  }
`

export const ModalBody = styled(ReactstrapModalBody)`
  @media (min-width: 991.98px) {
    max-height: 66vh;
    margin: auto;
  }

  @media (max-width: 992px) {
    margin: 1rem 0;
    padding: 0;
  }

  overflow-y: auto;
`

export const ModalFooter = styled(ReactstrapModalFooter)`
  margin: 0;
  padding: 0;
`

export function CitationButton() {
  const { t } = useTranslation()
  const [showCitation, setShowCitation] = useState(false)
  const toggleOpen = useCallback(() => setShowCitation((showCitation) => !showCitation), [])
  const open = useCallback(() => setShowCitation(true), [])
  const close = useCallback(() => setShowCitation(false), [])
  const text = t('Citation')
  const closeText = t('Close this window')

  return (
    <>
      <ButtonCitationBase type="button" color="link" onClick={open} title={text}>
        <span className="d-none d-xl-inline">{text}</span>
      </ButtonCitationBase>

      <Modal centered isOpen={showCitation} toggle={toggleOpen} fade={false} size="lg">
        <ModalHeader toggle={close} tag="div">
          <h2 className="text-center">{text}</h2>
        </ModalHeader>

        <ModalBody>
          <Citation />
        </ModalBody>

        <ModalFooter>
          <Container fluid>
            <Row noGutters className="my-2">
              <Col className="d-flex w-100">
                <ButtonOk className="ml-auto" type="button" color="success" onClick={close} title={closeText}>
                  {t('OK')}
                </ButtonOk>
              </Col>
            </Row>
          </Container>
        </ModalFooter>
      </Modal>
    </>
  )
}
