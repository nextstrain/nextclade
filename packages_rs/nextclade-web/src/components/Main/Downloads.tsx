import React, { HTMLProps, ReactNode } from 'react'

import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'
import { FaBook, FaDocker, FaDownload, FaGithub, FaGlobeAmericas } from 'react-icons/fa'
import {
  Card as ReactstrapCard,
  CardBody as ReactstrapCardBody,
  CardHeader as ReactstrapCardHeader,
  Col,
  Row,
} from 'reactstrap'
import styled from 'styled-components'

import { LinkExternal as LinkExternalBase } from 'src/components/Link/LinkExternal'

const DownloadLinkList = styled.ul`
  display: flex;
  flex-direction: column;
  list-style: none;
  padding: 0;
`

const DownloadLinkListItem = styled.li`
  display: flex;
  flex: 1;
  margin: auto;
`

const LinkExternal = styled(LinkExternalBase)`
  width: 200px;
  height: 55px;
  margin: 0.25rem;
  padding: 1rem;
`

const Card = styled(ReactstrapCard)`
  margin: 5px;
  height: 100%;
`

const CardBody = styled(ReactstrapCardBody)`
  padding: 0.5rem;
`

const CardHeader = styled(ReactstrapCardHeader)`
  padding: 1rem;
`

const iconDownload = <FaDownload color="#653F12" size={20} />
const iconGithub = <FaGithub color="444" size={20} />
const iconDocker = <FaDocker color="#369cec" size={20} />
const iconBook = <FaBook color="#777777" size={20} />
const iconGlobe = <FaGlobeAmericas color="#5862dc" size={20} />

export interface DownloadLinkProps extends HTMLProps<HTMLAnchorElement> {
  Icon: ReactNode
  text: string
  url: string
}

export function DownloadLink({ Icon, text, url }: DownloadLinkProps) {
  return (
    <DownloadLinkListItem>
      <LinkExternal href={url} className="btn btn-secondary d-flex" role="button">
        <span className="my-auto">{Icon}</span>
        <span className="my-auto ml-2">{text}</span>
      </LinkExternal>
    </DownloadLinkListItem>
  )
}

export function Downloads() {
  const { t } = useTranslation()

  return (
    <Row noGutters className="mt-5">
      <Col>
        <Row noGutters>
          <Col>
            <h3 className="text-center mx-2">{t('For more advanced use-cases:')}</h3>
          </Col>
        </Row>

        <Row noGutters>
          <Col lg={4}>
            <Card>
              <CardHeader>
                <h4 className="text-center">{'Nextclade CLI'}</h4>
                <p className="text-center">{t('faster, more configurable command-line version of this application')}</p>
              </CardHeader>

              <CardBody>
                <DownloadLinkList>
                  <DownloadLink
                    Icon={iconDownload}
                    text={t('Downloads')}
                    url="https://github.com/nextstrain/nextclade/releases"
                  />
                  <DownloadLink
                    Icon={iconDocker}
                    text={t('Docker')}
                    url="https://hub.docker.com/r/nextstrain/nextclade"
                  />
                  <DownloadLink
                    Icon={iconBook}
                    text={t('Documentation')}
                    url="https://docs.nextstrain.org/projects/nextclade/en/stable/user/nextclade-cli.html"
                  />
                </DownloadLinkList>
              </CardBody>
            </Card>
          </Col>

          <Col lg={4}>
            <Card>
              <CardHeader>
                <h4 className="text-center">{'Nextalign CLI'}</h4>
                <p className="text-center">
                  {t('pairwise reference alignment and translation tool used by Nextclade')}
                </p>
              </CardHeader>

              <CardBody>
                <DownloadLinkList>
                  <DownloadLink
                    Icon={iconDownload}
                    text={t('Downloads')}
                    url="https://github.com/nextstrain/nextclade/releases"
                  />
                  <DownloadLink
                    Icon={iconDocker}
                    text={t('Docker')}
                    url="https://hub.docker.com/r/nextstrain/nextalign"
                  />
                  <DownloadLink
                    Icon={iconBook}
                    text={t('Documentation')}
                    url="https://docs.nextstrain.org/projects/nextclade/en/stable/user/nextalign-cli.html"
                  />
                </DownloadLinkList>
              </CardBody>
            </Card>
          </Col>

          <Col lg={4}>
            <Card>
              <CardHeader>
                <h4 className="text-center">{'Nextstrain'}</h4>
                <p className="text-center">
                  {t('our parent project, an open-source initiative to harness the potential of pathogen genome data')}
                </p>
              </CardHeader>

              <CardBody>
                <DownloadLinkList>
                  <DownloadLink Icon={iconGlobe} text={'nextstrain.org'} url="https://nextstrain.org/" />
                  <DownloadLink Icon={iconGithub} text={t('Source code')} url="https://github.com/nextstrain" />
                  <DownloadLink Icon={iconBook} text={t('Documentation')} url="https://docs.nextstrain.org/" />
                  <DownloadLink Icon={iconGlobe} text={'auspice.us'} url="https://auspice.us/" />
                </DownloadLinkList>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Col>
    </Row>
  )
}
