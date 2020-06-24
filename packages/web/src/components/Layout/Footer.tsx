import React from 'react'

import { useTranslation } from 'react-i18next'
import { Col, Container, Row } from 'reactstrap'

import { PROJECT_NAME, COMPANY_NAME } from 'src/constants'
import { getCopyrightYearRange } from 'src/helpers/getCopyrightYearRange'
import { LinkExternal } from 'src/components/Link/LinkExternal'

import { ReactComponent as LogoNeherlab } from 'src/assets/img/neherlab.svg'
import { ReactComponent as LogoBiozentrum } from 'src/assets/img/biozentrum.svg'
import { ReactComponent as LogoUnibas } from 'src/assets/img/unibas.svg'
import { ReactComponent as LogoVercel } from 'src/assets/img/powered-by-vercel.svg'

export default function Footer() {
  const { t } = useTranslation()
  const copyrightYearRange = getCopyrightYearRange()

  return (
    <Container fluid className="py-3">
      <Row noGutters>
        <Col xs={12} md={4}>
          <div>
            {t('{{PROJECT_NAME}} (c) {{copyrightYearRange}} {{COMPANY_NAME}}', {
              PROJECT_NAME,
              copyrightYearRange,
              COMPANY_NAME,
            })}
          </div>
          <div>{t('Biozentrum')}</div>
          <div>{t('University of Basel')}</div>
        </Col>
        <Col>
          <Row>
            <Col style={{ padding: '15px 10px', margin: '10px 10px' }}>
              <LinkExternal url="">
                <LogoNeherlab height={35} />
              </LinkExternal>
            </Col>
            <Col style={{ backgroundColor: '#777', padding: '15px 10px', margin: '10px 10px' }}>
              <LinkExternal url="">
                <LogoBiozentrum height={35} />
              </LinkExternal>
            </Col>
            <Col style={{ backgroundColor: '#777', padding: '15px 10px', margin: '10px 10px' }}>
              <LinkExternal url="">
                <LogoUnibas height={35} />
              </LinkExternal>
            </Col>
            <Col style={{ padding: '15px 10px', margin: '10px 10px' }}>
              <LinkExternal url="https://vercel.com/?utm_source=nextstrain">
                <LogoVercel height={30} />
              </LinkExternal>
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  )
}
