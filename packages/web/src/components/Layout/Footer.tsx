import React from 'react'

import { useTranslation } from 'react-i18next'
import { Col, Container, Row } from 'reactstrap'
import styled from 'styled-components'

import { PROJECT_NAME, COMPANY_NAME } from 'src/constants'
import { getCopyrightYearRange } from 'src/helpers/getCopyrightYearRange'
import { LinkExternal } from 'src/components/Link/LinkExternal'
import { getVersionString } from 'src/helpers/getVersionString'

import { ReactComponent as LogoBedfordlab } from 'src/assets/img/bedfordlab.svg'
import { ReactComponent as LogoBiozentrum } from 'src/assets/img/biozentrum_square.svg'
import { ReactComponent as LogoFredHutch } from 'src/assets/img/fred_hutch.svg'
import { ReactComponent as LogoNeherlab } from 'src/assets/img/neherlab.svg'
// import { ReactComponent as LogoNextstrain } from 'src/assets/img/nextstrain_logo.svg'
// import { ReactComponent as LogoUnibas } from 'src/assets/img/unibas.svg'
import { ReactComponent as LogoVercel } from 'src/assets/img/powered-by-vercel.svg'

const FooterContainer = styled(Container)`
  background-color: #2a2a2a;
  color: #c4cdd5;
  padding: 6px 10px;
  border-top-left-radius: 3px;
  border-top-right-radius: 3px;
`

const CopyrightText = styled.div`
  font-size: 0.75rem;
  flex-grow: 1;

  @media (max-width: 576px) {
    font-size: 0.5rem;
  }
`

const LogoContainer = styled.div`
  flex-grow: 1;
  text-align: right;
`

const LogoLink = styled(LinkExternal)`
  padding: 10px 20px;

  svg {
    height: 20px;
  }

  @media (max-width: 768px) {
    padding: 5px 4px;
    flex-grow: 1;

    svg {
      height: 20px;
    }
  }

  @media (max-width: 576px) {
    padding: 5px 5px;
    flex-grow: 1;

    svg {
      height: 20px;
    }
  }
`

const VersionText = styled.div`
  flex-grow: 1;
  font-size: 0.75rem;
  text-align: right;

  @media (max-width: 992px) {
    display: none;
  }
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

          <LogoContainer className="mx-auto">
            <LogoLink url="https://neherlab.org">
              <LogoNeherlab />
            </LogoLink>

            <LogoLink url="https://www.biozentrum.unibas.ch">
              <LogoBiozentrum />
            </LogoLink>

            <LogoLink url="https://bedford.io">
              <LogoBedfordlab />
            </LogoLink>

            <LogoLink url="https://www.fredhutch.org">
              <LogoFredHutch />
            </LogoLink>

            <LogoLink className="my-auto" url="https://vercel.com/?utm_source=nextstrain">
              <LogoVercel />
            </LogoLink>
          </LogoContainer>

          <VersionText className="ml-auto my-auto">{getVersionString()}</VersionText>
        </Col>
      </Row>
    </FooterContainer>
  )
}
