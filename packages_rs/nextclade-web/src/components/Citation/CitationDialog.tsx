import React from 'react'
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
import { Citation } from 'src/components/Citation/Citation'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import styled from 'styled-components'

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

export interface CitationDialogProps {
  isOpen: boolean
  toggle: () => void
}

export default function CitationDialog({ isOpen, toggle }: CitationDialogProps) {
  const { t } = useTranslationSafe()
  const text = t('Citation')
  const closeText = t('Close this window')

  return (
    <Modal centered isOpen={isOpen} toggle={toggle} fade={false} size="lg">
      <ModalHeader toggle={toggle} tag="div">
        <h2 className="text-center">{text}</h2>
      </ModalHeader>

      <ModalBody>
        <Citation />
      </ModalBody>

      <ModalFooter>
        <Container fluid>
          <Row noGutters className="my-2">
            <Col className="d-flex w-100">
              <ButtonOk className="ml-auto" type="button" color="success" onClick={toggle} title={closeText}>
                {t('Ok')}
              </ButtonOk>
            </Col>
          </Row>
        </Container>
      </ModalFooter>
    </Modal>
  )
}
