import React, { HTMLProps, ReactNode } from 'react'

import { useTranslation } from 'react-i18next'
import { FaApple, FaDocker, FaGithub, FaLinux, FaNpm } from 'react-icons/fa'
import { Badge, Card, CardBody, Col, Row } from 'reactstrap'
import styled from 'styled-components'

import { LinkExternal } from 'src/components/Link/LinkExternal'

const DownloadLinkList = styled.ul`
  list-style: none;
`

const DownloadLinkListItem = styled.li``

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
        <Card>
          <CardBody>
            <Row noGutters>
              <Col>
                <h3 className="text-center">{t('Downloads')}</h3>
                <p className="text-center mx-2">{t('For advanced use-cases check out these command-line tools:')}</p>
              </Col>
            </Row>

            <Row noGutters>
              <Col className="px-3" lg={4}>
                <h4 className="text-center">
                  <span>
                    <span>{t('Nextclade CLI (v1)')}</span>
                    <BadgeDeprecated color="primary">{t('Recommended')}</BadgeDeprecated>
                  </span>
                </h4>
                <p className="text-justify mx-2">
                  {t(
                    'Nextclade CLI is a command line version of Nextclade in the form of a standalone executable. It consumes the same inputs and the same outputs as this web application, but is faster, more configuable and more convenient for scripting, automation, and integration into bioinformatics pipelines. Nextclade CLI is available for as a single-file download for different platforms and as a Docker container image. After download, type "nextclade --help" to get started.',
                  )}
                </p>

                <DownloadLinkList>
                  <DownloadLink
                    className="d-block mx-2"
                    Icon={<FaLinux color="#653F12" size={20} />}
                    text={t('Linux')}
                    url="https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-Linux-x86_64"
                    download
                  />
                  <DownloadLink
                    className="d-block mx-2"
                    Icon={<FaApple color="666" size={20} />}
                    text={t('macOS (Intel)')}
                    url="https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-MacOS-x86_64"
                    download
                  />
                  <DownloadLink
                    className="d-block mx-2"
                    Icon={<FaApple color="666" size={20} />}
                    text={t('macOS (Apple Silicon)')}
                    url="https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-MacOS-arm64"
                    download
                  />
                  <DownloadLink
                    className="d-block mx-2"
                    Icon={<FaGithub color="444" size={18} />}
                    text={t('All versions')}
                    url="https://github.com/nextstrain/nextclade/releases"
                  />
                  <DownloadLink
                    className="d-block mx-2"
                    Icon={<FaDocker color="#369cec" size={20} />}
                    text={t('nextstrain/nextclade on Docker Hub')}
                    url="https://hub.docker.com/r/nextstrain/nextclade"
                  />
                </DownloadLinkList>
              </Col>

              <Col className="px-3" lg={4}>
                <h4 className="text-center">
                  <span>
                    <span>{t('Nextalign CLI (v1)')}</span>
                  </span>
                </h4>
                <p className="text-justify mx-2">
                  {t(
                    'Nextalign is a sequence reference alignment tool which uses the same alignment algorithm as Nextclade, but is much faster. It is available as a set of static executables for different platforms and as a Docker container image. After download, type "nextclade --help" to get started.',
                  )}
                </p>

                <DownloadLinkList>
                  <DownloadLink
                    className="d-block mx-2"
                    Icon={<FaLinux color="#653F12" size={20} />}
                    text={t('Linux')}
                    url="https://github.com/nextstrain/nextclade/releases/latest/download/nextalign-Linux-x86_64"
                    download
                  />
                  <DownloadLink
                    className="d-block mx-2"
                    Icon={<FaApple color="666" size={20} />}
                    text={t('macOS (Intel)')}
                    url="https://github.com/nextstrain/nextclade/releases/latest/download/nextalign-MacOS-x86_64"
                    download
                  />
                  <DownloadLink
                    className="d-block mx-2"
                    Icon={<FaApple color="666" size={20} />}
                    text={t('macOS (Apple Silicon)')}
                    url="https://github.com/nextstrain/nextclade/releases/latest/download/nextalign-MacOS-arm64"
                    download
                  />
                  <DownloadLink
                    className="d-block mx-2"
                    Icon={<FaGithub color="444" size={18} />}
                    text={t('All versions')}
                    url="https://github.com/nextstrain/nextclade/releases"
                  />
                  <DownloadLink
                    className="d-block mx-2"
                    Icon={<FaDocker color="#369cec" size={20} />}
                    text={t('nextstrain/nextalign on Docker Hub')}
                    url="https://hub.docker.com/r/nextstrain/nextalign"
                  />
                </DownloadLinkList>
              </Col>

              <Col className="px-3" lg={4}>
                <h4 className="text-center">
                  <span>
                    <span>{t('Nextclade CLI (v0)')}</span>
                    <BadgeDeprecated color="secondary">{t('Deprecated')}</BadgeDeprecated>
                  </span>
                </h4>

                <p className="text-justify mx-2">
                  {t(
                    "Nextclade CLI as a command-line tool based on Nextclade's algorithm. It accepts the same inputs and produces the same outputs as Nextclade export feature. It is available as an NPM package and as a Docker container image. Read more on ",
                  )}
                  <LinkExternal href="https://github.com/nextstrain/nextclade/blob/master/packages/cli/README.md">
                    {'GitHub'}
                  </LinkExternal>
                  {'.'}
                </p>

                <DownloadLinkList>
                  <DownloadLink
                    className="d-block mx-2"
                    Icon={<FaDocker color="#369cec" size={20} />}
                    text="nextstrain/nextclade on Docker Hub"
                    url="https://hub.docker.com/r/nextstrain/nextclade"
                  />
                  <DownloadLink
                    className="d-block mx-2"
                    Icon={<FaNpm color="#cc5555" size={20} />}
                    text="@nextstrain/nextclade on NPM"
                    url="https://www.npmjs.com/package/@nextstrain/nextclade"
                  />
                </DownloadLinkList>
              </Col>
            </Row>
          </CardBody>
        </Card>
      </Col>
    </Row>
  )
}
