import React from 'react'

import { useTranslation } from 'react-i18next'
import { Alert, Button, Col, Row } from 'reactstrap'
import { IoMdCheckmarkCircle, IoMdCloseCircle } from 'react-icons/io'
import styled from 'styled-components'

import { theme } from 'src/theme'
import { ErrorContent } from 'src/components/Error/ErrorPopup'
import { Spinner } from 'src/components/Common/Spinner'

const Container = styled.div`
  width: 100%;
`

export const UploadZoneWrapper = styled.div`
  width: 100%;
  height: 100%;
`

export const UploadZone = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`

export const UploadZoneLeft = styled.div`
  display: flex;
  flex: 1 1 40%;
  margin: auto;
  margin-right: 20px;
`

export const UploadZoneRight = styled.div`
  display: flex;
  flex: 1 0 60%;
`

export const FileIconsContainer = styled.div`
  text-align: center;
`

export const UploadZoneTextContainer = styled.div`
  display: block;
  margin: auto;
  text-align: center;
`

export const UploadZoneButtonContainer = styled.div`
  text-align: center;
`

export const UploadZoneDescription = styled.div`
  font-size: 1.1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
`

export const UploadZoneTextOr = styled.div`
  margin-top: 10px;
  font-size: 0.9rem;
  font-weight: light;
`

export const UploadZoneButton = styled(Button)`
  margin-top: 10px;
  min-width: 160px;
  min-height: 50px;
`

export const FileErrorStyled = styled(Alert)`
  display: flex;
  text-align: left;

  margin: 5px 5px;

  :first-child {
    //margin-top: 0;
  }

  box-shadow: ${(props) => props.theme.shadows.slight};
`

export function UploadedFileLoadingInfo() {
  return (
    <Container>
      <UploadZoneWrapper>
        <UploadZone>
          <Row noGutters className="d-flex">
            <Col className="d-flex">
              <UploadZoneTextContainer className="m-auto">
                <Spinner type="ThreeDots" size={20} color="#aaa" />
              </UploadZoneTextContainer>
            </Col>
          </Row>
        </UploadZone>
      </UploadZoneWrapper>
    </Container>
  )
}
