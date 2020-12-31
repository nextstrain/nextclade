import { MDXProvider } from '@mdx-js/react'
import React from 'react'

import { useTranslation } from 'react-i18next'
import { connect } from 'react-redux'
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
import { setShowWhatsnew } from 'src/state/ui/ui.actions'
import styled from 'styled-components'
import { FaListUl } from 'react-icons/fa'

import { URL_GITHUB_COMMITS, URL_GITHUB_ISSUES } from 'src/constants'
import type { State } from 'src/state/reducer'
import { setShowWhatsnewOnUpdate } from 'src/state/settings/settings.actions'
import { ButtonTransparent } from 'src/components/Common/ButtonTransparent'
import { LinkExternal } from 'src/components/Link/LinkExternal'
import { Toggle } from 'src/components/Common/Toggle'
import Changelog from '../../../CHANGELOG.md'

export const ButtonWhatsNewBase = styled(ButtonTransparent)<ButtonProps>`
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

export const ModalHeader = styled(ReactstrapModalHeader)`
  .modal-title {
    width: 100%;
  }
`

export const Modal = styled(ReactstrapModal)`
  @media (max-width: 1200px) {
    min-width: 80vw;
  }
  @media (min-width: 1201px) {
    min-width: 957px;
  }
`

export const ModalBody = styled(ReactstrapModalBody)`
  max-height: 66vh;
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
`

export const ModalFooter = styled(ReactstrapModalFooter)``

export const H1 = styled.h1`
  font-size: 1.25rem;
`

export const H2 = styled.h2`
  border-top: #ccc solid 1px;
  padding-top: 1rem;
  margin-top: 2rem;
  font-size: 1.25rem;
`

export const H3 = styled.h2`
  font-size: 1rem;
`

export const Blockquote = styled.blockquote`
  padding: 6px 8px;
  border-radius: 3px;
  background-color: #f4ebbd;
`

export const Pre = styled.pre`
  padding: 6px 8px;
  border-radius: 3px;
  background-color: #ccc;

  code {
    border: none;
    border-radius: 0;
    margin: 0;
    padding: 0;
  }
`

export interface WhatsNewButtonProps {
  showWhatsnew: boolean
  showWhatsnewOnUpdate: boolean

  setShowWhatsnew(showWhatsnew: boolean): void

  setShowWhatsnewOnUpdate(showWhatsnewOnUpdate: boolean): void
}

const mapStateToProps = (state: State) => ({
  showWhatsnew: state.ui.showWhatsnew,
  showWhatsnewOnUpdate: state.settings.showWhatsnewOnUpdate,
})

const mapDispatchToProps = {
  setShowWhatsnew,
  setShowWhatsnewOnUpdate,
}

export const WhatsNewButton = connect(mapStateToProps, mapDispatchToProps)(WhatsNewButtonDisconnected)

export function WhatsNewButtonDisconnected({
  showWhatsnew,
  showWhatsnewOnUpdate,
  setShowWhatsnew,
  setShowWhatsnewOnUpdate,
}: WhatsNewButtonProps) {
  const { t } = useTranslation()

  function toggleOpen() {
    setShowWhatsnew(!showWhatsnew)
  }

  function open() {
    setShowWhatsnew(true)
  }

  function close() {
    setShowWhatsnew(false)
  }

  const text = t("What's new")
  const closeText = t('Close this window')

  return (
    <>
      <ButtonWhatsNewBase type="button" onClick={open} title={text}>
        <FaListUl className="mr-xl-2" />
        <span className="d-none d-xl-inline">{text}</span>
      </ButtonWhatsNewBase>

      <Modal centered isOpen={showWhatsnew} toggle={toggleOpen} fade={false} size="lg">
        <ModalHeader toggle={close} tag="div">
          <h3 className="text-center">{text}</h3>
        </ModalHeader>

        <ModalBody>
          <MDXProvider components={{ h1: H1, h2: H2, h3: H3, a: LinkExternal, blockquote: Blockquote, pre: Pre }}>
            <Changelog />
          </MDXProvider>
        </ModalBody>

        <ModalFooter>
          <Container fluid>
            <Row noGutters className="mb-3">
              <Col>
                {t('For more details see ')}
                <LinkExternal href={URL_GITHUB_ISSUES}>{t('recent GitHub issues')}</LinkExternal>
                {t(' and ')}
                <LinkExternal href={URL_GITHUB_COMMITS}>{t('recent GitHub commit history')}</LinkExternal>
                {t('. ')}
                {t(
                  'If you want to ask a question, to request a feature, or to report a bug, reach out to developers by creating a GitHub issue.',
                )}
              </Col>
            </Row>

            <Row noGutters className="my-2">
              <Col className="d-flex w-100">
                <div className="ml-auto">
                  <Toggle
                    className="ml-auto"
                    identifier={'show-whatsnew-again-toggle'}
                    checked={showWhatsnewOnUpdate}
                    onCheckedChanged={setShowWhatsnewOnUpdate}
                  >
                    {t('Show this dialog every time a new version is available')}
                  </Toggle>
                </div>
              </Col>
            </Row>

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
