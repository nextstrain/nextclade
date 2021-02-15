import React from 'react'

import { useTranslation } from 'react-i18next'
import { Alert, Col, Row } from 'reactstrap'
import { MdWarning } from 'react-icons/md'

import { LinkExternal } from 'src/components/Link/LinkExternal'
import { About } from 'src/components/About/About'
import { Downloads } from 'src/components/Main/Downloads'

import { URL_GITHUB, URL_GITHUB_FRIENDLY } from 'src/constants'

export function MainSectionInfo() {
  const { t } = useTranslation()

  return (
    <Row noGutters className="mx-2 mt-3 main-info-section">
      <Col>
        <Row noGutters>
          <Col className="text-center">
            <Alert color="warning" fade={false} className="d-inline-flex mx-auto main-dev-alert">
              <Row>
                <Col lg={2} md={3} sm={2} className="my-auto">
                  <MdWarning size={45} />
                </Col>
                <Col className="small text-left over">
                  {t(
                    'Nextclade is currently under active development. ' +
                      'Implementation details and data formats are subjects to change. ' +
                      'The app may contain bugs. Please report any issues and leave feedback at {{githubURL}}',
                    { githubURL: '' },
                  )}
                  <LinkExternal href={URL_GITHUB}>{URL_GITHUB_FRIENDLY}</LinkExternal>
                </Col>
              </Row>
            </Alert>
          </Col>
        </Row>

        <Row noGutters>
          <Col>
            <Downloads />
          </Col>
        </Row>

        <Row noGutters className="mt-3 mx-auto">
          <Col>
            <About />
          </Col>
        </Row>
      </Col>
    </Row>
  )
}
