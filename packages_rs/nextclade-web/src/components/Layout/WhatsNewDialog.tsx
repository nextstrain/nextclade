import { MDXProvider } from '@mdx-js/react'
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
import { useRecoilState } from 'recoil'
import { Toggle } from 'src/components/Common/Toggle'
import { LinkExternal } from 'src/components/Link/LinkExternal'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { changelogShouldShowOnUpdatesAtom } from 'src/state/settings.state'
import styled from 'styled-components'
import Changelog from '../../../../../CHANGELOG.md'

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

  @media (max-width: 1200px) {
    min-width: 80vw;
  }

  @media (min-width: 1199.98px) {
    min-width: 957px;
  }

  @media (min-width: 991.98px) {
    margin: 0.1vh auto;
  }

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
  max-width: 100%;

  @media (min-width: 991.98px) {
    max-height: 66vh;
    margin: auto;
  }

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

  h1:first-child,
  h2:first-child {
    border-top: none;
    padding-top: 0;
    margin-top: 0;
  }

  code {
    padding: 2px;
    background-color: #eaeaea;
    border-radius: 2px;
    overflow-wrap: break-word;
    white-space: pre-wrap;
  }

  pre {
    padding: 2px;
    background-color: #eaeaea;
    border-radius: 2px;
    overflow-wrap: break-word;
    white-space: pre-wrap;
  }
`
export const ModalFooter = styled(ReactstrapModalFooter)`
  margin: 0;
  padding: 0;
`
export const H1 = styled.h1`
  font-size: 2.5rem;
  font-weight: bold;

  @media (max-width: 992px) {
    font-size: 2rem;
  }
`
export const H2 = styled.h2`
  border-top: #ccc solid 1px;
  padding-top: 1rem;
  font-size: 2rem;
  font-weight: bold;
  margin-top: 2rem;

  @media (max-width: 992px) {
    font-size: 1.75rem;
    margin-top: 1.25rem;
  }
`
export const H3 = styled.h3`
  font-size: 1.75rem;
  font-weight: bold;
  margin-top: 2.5rem;

  @media (max-width: 992px) {
    font-size: 1.5rem;
    margin-top: 1.5rem;
  }
`
export const H4 = styled.h4`
  font-size: 1.33rem;
  font-weight: bold;
  margin-top: 2rem;

  @media (max-width: 992px) {
    font-size: 1.2rem;
    margin-top: 1.2rem;
  }
`
export const H5 = styled.h5`
  font-size: 1.1rem;
  font-weight: bold;
  margin-top: 1.1rem;

  @media (max-width: 992px) {
    font-size: 1rem;
    margin-top: 1.1rem;
  }
`
export const H6 = styled.h6`
  font-size: 1rem;
  font-weight: bold;
`
export const Blockquote = styled.blockquote`
  padding: 6px 8px;
  border-radius: 3px;
  background-color: #f4ebbd;
`
export const components = { h1: H1, h2: H2, h3: H3, h4: H4, h5: H5, h6: H6, a: LinkExternal, blockquote: Blockquote }

export interface WhatsNewDialogProps {
  isOpen: boolean
  toggle: () => void
}

export default function WhatsNewDialog({ isOpen, toggle }: WhatsNewDialogProps) {
  const { t } = useTranslationSafe()
  const [showChangelogOnUpdate, setShowChangelogOnUpdate] = useRecoilState(changelogShouldShowOnUpdatesAtom)
  const text = t("What's new")
  const closeText = t('Close this window')

  return (
    <Modal centered isOpen={isOpen} toggle={toggle} fade={false} size="lg">
      <ModalHeader toggle={toggle} tag="div">
        <H1 className="text-center">{text}</H1>
      </ModalHeader>

      <ModalBody>
        <MDXProvider components={components}>
          <Changelog />
        </MDXProvider>
      </ModalBody>

      <ModalFooter>
        <Container fluid>
          <Row noGutters className="my-2">
            <Col className="d-flex w-100">
              <div className="ml-auto">
                <Toggle
                  className="m-0"
                  identifier={'show-whatsnew-again-toggle'}
                  checked={showChangelogOnUpdate}
                  onCheckedChanged={setShowChangelogOnUpdate}
                >
                  {t('Show when a new version is available')}
                </Toggle>
              </div>
            </Col>
          </Row>

          <Row noGutters className="my-2">
            <Col className="d-flex w-100">
              <ButtonOk className="ml-auto" type="button" color="success" onClick={toggle} title={closeText}>
                {t('OK')}
              </ButtonOk>
            </Col>
          </Row>
        </Container>
      </ModalFooter>
    </Modal>
  )
}
