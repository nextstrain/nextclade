import React from 'react'
import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'
import { Col, Row } from 'reactstrap'
import styled from 'styled-components'
import { PROJECT_NAME, COMPANY_NAME } from 'src/constants'
import { getCopyrightYearRange } from 'src/helpers/getCopyrightYearRange'
import { LinkExternal } from 'src/components/Link/LinkExternal'
import { getVersionString } from 'src/helpers/getVersionString'
import LogoBedfordlab from 'src/assets/img/bedfordlab.svg'
import LogoBiozentrum from 'src/assets/img/biozentrum_square.svg'
import LogoSib from 'src/assets/img/sib.logo.svg'
import LogoFredHutch from 'src/assets/img/fred_hutch.svg'
import LogoNeherlab from 'src/assets/img/neherlab.svg'

const Container = styled.footer`
  height: 38px;
  width: 100%;
  bottom: 0;
  padding: 10px;
  box-shadow: ${(props) => props.theme.shadows.large};
  background-color: ${(props) => props.theme.white};
  opacity: 1;
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
  text-align: center;
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

export function Footer() {
  const { t } = useTranslation()
  const copyrightYearRange = getCopyrightYearRange()

  return (
    <Container>
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

            <LogoLink url="https://www.sib.swiss">
              <LogoSib />
            </LogoLink>

            <LogoLink url="https://bedford.io">
              <LogoBedfordlab />
            </LogoLink>

            <LogoLink url="https://www.fredhutch.org">
              <LogoFredHutch />
            </LogoLink>
          </LogoContainer>

          <VersionText className="ml-auto my-auto">{getVersionString()}</VersionText>
        </Col>
      </Row>
    </Container>
  )
}
