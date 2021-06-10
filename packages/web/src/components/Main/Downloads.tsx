import React, { HTMLProps, ReactNode } from 'react'

import { useTranslation } from 'react-i18next'
import { FaApple, FaDocker, FaGithub, FaLinux, FaNpm } from 'react-icons/fa'
import {
  Badge,
  Card as ReactstrapCard,
  CardBody as ReactstrapCardBody,
  CardFooter as ReactstrapCardFooter,
  CardHeader as ReactstrapCardHeader,
  Col,
  Row,
} from 'reactstrap'
import styled from 'styled-components'

import { LinkExternal } from 'src/components/Link/LinkExternal'

const DownloadLinkList = styled.ul`
  padding-top: 1rem;
  list-style: none;
`

const DownloadLinkListItem = styled.li``

const Card = styled(ReactstrapCard)`
  margin: 5px;
  height: 100%;
`

const CardBody = styled(ReactstrapCardBody)`
  padding: 0.75rem;
`

const CardFooter = styled(ReactstrapCardFooter)`
  min-height: 185px;
  background: transparent;
`

const CardHeader = styled(ReactstrapCardHeader)`
  padding-top: 2rem;
  background: transparent;
`

export interface DownloadLinkProps extends HTMLProps<HTMLAnchorElement> {
  Icon: ReactNode
  text: string
  url: string
}

export function DownloadLink({ Icon, text, url, ...restProps }: DownloadLinkProps) {
  return (
    <DownloadLinkListItem>
      <LinkExternal href={url} {...restProps}>
        <span className="mb-1">{Icon}</span>
        <span className="ml-2">{text}</span>
      </LinkExternal>
    </DownloadLinkListItem>
  )
}

const BadgeDeprecated = styled(Badge)`
  position: relative;
  top: -12px;
  font-size: 0.8rem;
`

export function Downloads() {
  const { t } = useTranslation()

  return (
    <Row noGutters>
      <Col>
        <Row noGutters>
          <Col>
            <h3 className="text-center">{t('Downloads')}</h3>
            <p className="text-center mx-2">{t('For advanced use-cases check out these command-line tools:')}</p>
          </Col>
        </Row>

        <Row noGutters>
          <Col lg={4}>
            <Card>
              <CardHeader>
                <h4 className="text-center">
                  <span>
                    <span>{t('Nextclade CLI (v1)')}</span>
                    <BadgeDeprecated color="primary">{t('Recommended')}</BadgeDeprecated>
                  </span>
                </h4>
              </CardHeader>

              <CardBody>
                <span className="text-justify mx-2">
                  {t(
                    'Nextclade CLI is a command line version of Nextclade in the form of a standalone executable. It consumes the same inputs and the same outputs as this web application, but is faster, more configuable and more convenient for scripting, automation, and integration into bioinformatics pipelines. Nextclade CLI is available for as a single-file download for different platforms and as a Docker container image. After download, type "nextclade --help" to get started.',
                  )}
                </span>
              </CardBody>

              <CardFooter>
                <DownloadLinkList>
                  <DownloadLink
                    Icon={<FaLinux color="#653F12" size={20} />}
                    text={t('Linux')}
                    url="https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-Linux-x86_64"
                    download
                  />
                  <DownloadLink
                    Icon={<FaApple color="666" size={20} />}
                    text={t('macOS (Intel)')}
                    url="https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-MacOS-x86_64"
                    download
                  />
                  <DownloadLink
                    Icon={<FaApple color="666" size={20} />}
                    text={t('macOS (Apple Silicon)')}
                    url="https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-MacOS-arm64"
                    download
                  />
                  <DownloadLink
                    Icon={<FaGithub color="444" size={18} />}
                    text={t('All versions')}
                    url="https://github.com/nextstrain/nextclade/releases"
                  />
                  <DownloadLink
                    Icon={<FaDocker color="#369cec" size={20} />}
                    text={t('nextstrain/nextclade')}
                    url="https://hub.docker.com/r/nextstrain/nextclade"
                  />
                </DownloadLinkList>
              </CardFooter>
            </Card>
          </Col>

          <Col lg={4}>
            <Card>
              <CardHeader>
                <h4 className="text-center">
                  <span>
                    <span>{t('Nextalign CLI (v1)')}</span>
                  </span>
                </h4>
              </CardHeader>

              <CardBody>
                <span className="text-justify mx-2">
                  {t(
                    'Nextalign CLI is a sequence reference alignment tool which uses the same alignment algorithm as Nextclade. Use it if you only need sequence alignedment and translated peptides, without full analysis and quality control features. It is available as a set of static executables for different platforms and as a Docker container image. After download, type "nextalign --help" to get started.',
                  )}
                </span>
              </CardBody>

              <CardFooter>
                <DownloadLinkList>
                  <DownloadLink
                    Icon={<FaLinux color="#653F12" size={20} />}
                    text={t('Linux')}
                    url="https://github.com/nextstrain/nextclade/releases/latest/download/nextalign-Linux-x86_64"
                    download
                  />
                  <DownloadLink
                    Icon={<FaApple color="666" size={20} />}
                    text={t('macOS (Intel)')}
                    url="https://github.com/nextstrain/nextclade/releases/latest/download/nextalign-MacOS-x86_64"
                    download
                  />
                  <DownloadLink
                    Icon={<FaApple color="666" size={20} />}
                    text={t('macOS (Apple Silicon)')}
                    url="https://github.com/nextstrain/nextclade/releases/latest/download/nextalign-MacOS-arm64"
                    download
                  />
                  <DownloadLink
                    Icon={<FaGithub color="444" size={18} />}
                    text={t('All versions')}
                    url="https://github.com/nextstrain/nextclade/releases"
                  />
                  <DownloadLink
                    Icon={<FaDocker color="#369cec" size={20} />}
                    text={t('nextstrain/nextalign')}
                    url="https://hub.docker.com/r/nextstrain/nextalign"
                  />
                </DownloadLinkList>
              </CardFooter>
            </Card>
          </Col>

          <Col lg={4}>
            <Card>
              <CardHeader>
                <h4 className="text-center">
                  <span>
                    <span>{t('Nextclade CLI (v0)')}</span>
                    <BadgeDeprecated color="secondary">{t('Deprecated')}</BadgeDeprecated>
                  </span>
                </h4>
              </CardHeader>

              <CardBody>
                <span className="text-justify mx-2">
                  {t(
                    "Nextclade CLI v0 is the previous implementation of Nextclade's algorithm. For all new experiements, it is now recommended to use Nextxclade CLI v1. Use v0 only if you have to. It is available as an NPM package and as a Docker container image.",
                  )}
                </span>
              </CardBody>

              <CardFooter>
                <DownloadLinkList>
                  <DownloadLink
                    Icon={<FaDocker color="#369cec" size={20} />}
                    text="nextstrain/nextclade"
                    url="https://hub.docker.com/r/nextstrain/nextclade"
                  />
                  <DownloadLink
                    Icon={<FaNpm color="#cc5555" size={20} />}
                    text="@nextstrain/nextclade on NPM"
                    url="https://www.npmjs.com/package/@nextstrain/nextclade"
                  />
                </DownloadLinkList>
              </CardFooter>
            </Card>
          </Col>
        </Row>
      </Col>
    </Row>
  )
}
