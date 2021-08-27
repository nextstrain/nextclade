import React, { HTMLProps, ReactNode } from 'react'

import { useTranslation } from 'react-i18next'
import { FaApple, FaBook, FaDocker, FaGithub, FaGlobeAmericas, FaLinux } from 'react-icons/fa'
import {
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
                <h4 className="text-center">
                  <span>
                    <span>{t('Nextclade CLI')}</span>
                  </span>
                </h4>
              </CardHeader>

              <CardBody>
                <p className="text-justify mx-2">
                  {t('Nextclade CLI is a command line version of this web application.')}
                </p>

                <p className="text-justify mx-2">
                  {t(
                    'It is a single-file, standalone executable, consumes the same inputs and the same outputs as this web application, but is faster, more configurable and more convenient for scripting, automation, and integration into bioinformatics pipelines. Nextclade CLI is available for as a single-file download for different platforms and as a Docker container image. After download, type "nextclade --help" to get started.',
                  )}
                </p>
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
                  <DownloadLink
                    Icon={<FaBook color="#777777" size={20} />}
                    text={t('Documentation')}
                    url="https://docs.nextstrain.org/projects/nextclade/nextclade-cli"
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
                    <span>{t('Nextalign CLI')}</span>
                  </span>
                </h4>
              </CardHeader>

              <CardBody>
                <p className="text-justify mx-2">{t('Nextalign CLI is a sequence reference alignment tool.')}</p>

                <p className="text-justify mx-2">
                  {t(
                    'It uses the same alignment algorithm as Nextclade. Useful if you only need sequence alignment and translated peptides, without full analysis and quality control features. It is available as a set of static executables for different platforms and as a Docker container image. After download, type "nextalign --help" to get started.',
                  )}
                </p>
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
                  <DownloadLink
                    Icon={<FaBook color="#777777" size={20} />}
                    text={t('Documentation')}
                    url="https://docs.nextstrain.org/projects/nextclade/nextalign-cli"
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
                    <span>{t('Nextstrain')}</span>
                  </span>
                </h4>
              </CardHeader>

              <CardBody>
                <p className="text-justify mx-2">{t('Nextclade is a part of Nextstrain project.')}</p>

                <p className="text-justify mx-2">
                  {t(
                    'Nextstrain is an open-source project to harness the scientific and public health potential of pathogen genome data. It provides continually-updated view of publicly available data with powerful analyses and visualizations showing pathogen evolution and epidemic spread. The goal is to aid epidemiological understanding and improve outbreak response.',
                  )}
                </p>

                <p className="text-justify mx-2">
                  {t('Learn more about Nextstrain project as a whole, and about its subprojects.')}
                </p>
              </CardBody>

              <CardFooter>
                <DownloadLinkList>
                  <DownloadLink
                    Icon={<FaGlobeAmericas color="#4f88b0" size={20} />}
                    text={t('nextstrain.org')}
                    url="https://nextstrain.org/"
                  />
                  <DownloadLink
                    Icon={<FaGithub color="444" size={18} />}
                    text={t('Source code')}
                    url="https://github.com/nextstrain"
                  />
                  <DownloadLink
                    Icon={<FaBook color="#777777" size={20} />}
                    text={t('Documentation: Home')}
                    url="https://docs.nextstrain.org/"
                  />
                  <DownloadLink
                    Icon={<FaBook color="#777777" size={20} />}
                    text={t('Documentation: Augur')}
                    url="https://docs.nextstrain.org/projects/augur"
                  />
                  <DownloadLink
                    Icon={<FaBook color="#777777" size={20} />}
                    text={t('Documentation: Auspice')}
                    url="https://docs.nextstrain.org/projects/auspice"
                  />
                  <DownloadLink
                    Icon={<FaBook color="#777777" size={20} />}
                    text={t('Documentation: Nextstrain CLI')}
                    url="https://docs.nextstrain.org/projects/cli"
                  />
                  <DownloadLink
                    Icon={<FaGlobeAmericas color="#4f88b0" size={20} />}
                    text={t('auspice.us')}
                    url="https://auspice.us/"
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
