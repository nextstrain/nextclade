import React from 'react'

import { useTranslation } from 'react-i18next'
import { Col, Container, Row } from 'reactstrap'
import styled from 'styled-components'

import { PROJECT_NAME, COMPANY_NAME } from 'src/constants'
import { getCopyrightYearRange } from 'src/helpers/getCopyrightYearRange'
import { LinkExternal } from 'src/components/Link/LinkExternal'

import { ReactComponent as LogoVercel } from 'src/assets/img/powered-by-vercel.svg'
import { getVersionString } from 'src/helpers/getVersionString'

const FooterContainer = styled(Container)`
  background-color: #2a2a2a;
  color: #c4cdd5;
`

const VersionText = styled.div`
  font-size: 0.75rem;
`

const CopyrightText = styled.div`
  font-size: 0.75rem;
`

export default function Footer() {
  const { t } = useTranslation()
  const copyrightYearRange = getCopyrightYearRange()

  return (
    <FooterContainer fluid tag="footer">
      <Row noGutters>
        <Col className="d-flex">
          <CopyrightText className="mr-auto my-auto">
            {t('{{PROJECT_NAME}} (c) {{copyrightYearRange}} {{COMPANY_NAME}}', {
              PROJECT_NAME,
              copyrightYearRange,
              COMPANY_NAME,
            })}
          </CopyrightText>

          <div className="mx-auto mt-2 mb-1">
            <LinkExternal className="my-auto" url="https://vercel.com/?utm_source=nextstrain">
              <LogoVercel height={25} />
            </LinkExternal>
          </div>

          <VersionText className="ml-auto my-auto">{getVersionString()}</VersionText>
        </Col>
      </Row>
    </FooterContainer>
  )
}
