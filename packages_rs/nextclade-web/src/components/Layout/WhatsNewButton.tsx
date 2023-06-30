import { MDXProvider } from '@mdx-js/react'
import React, { useCallback } from 'react'

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
import { useRecoilState } from 'recoil'
import { changelogIsShownAtom, changelogShouldShowOnUpdatesAtom } from 'src/state/settings.state'
import styled from 'styled-components'
import { FaListUl } from 'react-icons/fa'

import { ButtonTransparent } from 'src/components/Common/ButtonTransparent'
import { LinkExternal } from 'src/components/Link/LinkExternal'
import { Toggle } from 'src/components/Common/Toggle'
import Changelog from '../../../../../CHANGELOG.md'

export const ButtonWhatsNewBase = styled(ButtonTransparent)<ButtonProps>`
  margin: 2px 2px;
  height: 38px;
  width: 50px;
  color: ${(props) => props.theme.gray700};

  @media (min-width: 1200px) {
    width: 100px;
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

// noinspection CssReplaceWithShorthandSafely
export const ModalBody = styled(ReactstrapModalBody)`
  max-width: 100%;

  @media (min-width: 991.98px) {
    max-height: 66vh;
    margin: auto;
  }

  overflow-y: auto;

  // prettier-ignore
  background: linear-gradient(${(props) =>
    props.theme.bodyBg}, transparent), linear-gradient(transparent, #ffffff 66%) 0 100%,
  radial-gradient(farthest-side at 50% 0, #7778, transparent), radial-gradient(farthest-side at 50% 100%, #7778, transparent) 0 100%;
  background-repeat: no-repeat;
  background-attachment: local, local, scroll, scroll;
  background-size: 100% 24px, 100% 24px, 100% 8px, 100% 8px;
`

export const ModalFooter = styled(ReactstrapModalFooter)`
  margin: 0;
  padding: 0;
`

export const H1 = styled.h1`
  font-weight: bold;
  font-size: 2.1rem;
`

export const H2 = styled.h2`
  font-size: 1.5rem;
  font-weight: bold;

  margin-top: 1.25rem;
  margin-bottom: 0.75rem;
  padding: 0.66rem;

  :first-child {
    margin-top: 0;
  }

  color: ${(props) => props.theme.gray300};
  background-color: ${(props) => props.theme.gray700};
  border-radius: 5px;
`

export const H3 = styled.h3`
  font-size: 1.25rem;
  font-weight: bold;

  margin: 0 !important;
  margin-top: 1rem !important;

  code {
    font-size: 1.1rem;
    background-color: #eaeaea;
    border-radius: 5px;
    overflow-wrap: break-word;
    white-space: pre-wrap;

    @media (max-width: 992px) {
      font-size: 1.1rem;
    }
  }
`

export const H4 = styled.h4`
  font-size: 1.33rem;
  font-weight: bold;

  padding: 0.3rem 0.8rem;

  @media (max-width: 992px) {
    font-size: 1.2rem;
    margin-top: 1.2rem;
  }
`

export const H5 = styled.h5`
  font-size: 1.1rem;
  font-weight: bold;
  margin-top: 1.1rem;

  padding: 0.3rem 0.8rem;

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

export const P = styled.p`
  margin: 0.3rem 0.8rem;

  code {
    font-size: 0.8rem;
    padding: 1px 5px;
    background-color: #eaeaea;
    border-radius: 5px;
    overflow-wrap: break-word;
    white-space: pre-wrap;
  }
`

export const Pre = styled.pre`
  margin: 0.3rem 0.8rem;
  padding: 0.7rem 0.5rem;

  background-color: #eaeaea;
  border-radius: 5px;
  overflow: hidden;
  overflow-wrap: break-word;
  white-space: pre-wrap;
  line-height: 1.33rem;
  font-size: 0.8rem;
`

export const Code = styled.code`
  font-size: 0.8rem;
  padding: 1px 0;
  background-color: #eaeaea;
  border-radius: 5px;
  overflow-wrap: break-word;
  white-space: pre-wrap;
`

export const Li = styled.li`
  & > p {
    margin: 0;
    padding: 0;
  }
`

const components = {
  h1: H1,
  h2: H2,
  h3: H3,
  h4: H4,
  h5: H5,
  h6: H6,
  a: LinkExternal,
  blockquote: Blockquote,
  p: P,
  li: Li,
  pre: Pre,
  code: Code,
}

export function WhatsNewButton() {
  const { t } = useTranslation()

  const [showChangelog, setShowChangelog] = useRecoilState(changelogIsShownAtom)
  const [showChangelogOnUpdate, setShowChangelogOnUpdate] = useRecoilState(changelogShouldShowOnUpdatesAtom)

  const toggleOpen = useCallback(() => {
    setShowChangelog((showChangelog) => !showChangelog)
  }, [setShowChangelog])

  const open = useCallback(() => {
    setShowChangelog(true)
  }, [setShowChangelog])

  const close = useCallback(() => {
    setShowChangelog(false)
  }, [setShowChangelog])

  const text = t("What's new")
  const closeText = t('Close this window')

  return (
    <>
      <ButtonWhatsNewBase type="button" onClick={open} title={text}>
        <FaListUl className="mr-xl-2" />
        <span className="d-none d-xl-inline">{text}</span>
      </ButtonWhatsNewBase>

      <Modal centered isOpen={showChangelog} toggle={toggleOpen} fade={false} size="lg">
        <ModalHeader toggle={close} tag="div">
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
