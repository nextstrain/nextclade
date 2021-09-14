import React from 'react'

import { useTranslation } from 'react-i18next'
import { Alert, Button, Col, Row } from 'reactstrap'
import { IoMdCheckmarkCircle, IoMdCloseCircle } from 'react-icons/io'
import styled from 'styled-components'

import { theme } from 'src/theme'
import { ErrorContent } from 'src/components/Error/ErrorPopup'

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
    margin-top: 0;
  }

  box-shadow: ${(props) => props.theme.shadows.slight};
`

function FileStatusIcon({ hasErrors }: { hasErrors: boolean }) {
  const ICON_SIZE = 70

  if (hasErrors) {
    return <IoMdCloseCircle size={ICON_SIZE} color={theme.danger} />
  }

  return <IoMdCheckmarkCircle size={ICON_SIZE} color={theme.success} />
}

function FileError({ error }: { error: Error }) {
  return (
    <FileErrorStyled color="danger">
      <ErrorContent error={error} />
    </FileErrorStyled>
  )
}

export interface UploadedFileInfoProps {
  description: string
  errors: Error[]
  onRemove(): void
}

export function UploadedFileInfo({ description, errors, onRemove }: UploadedFileInfoProps) {
  const { t } = useTranslation()

  const hasErrors = errors.length > 0

  // NOTE: This currently uses the Tab layout, even there's no tabs (1 invisible tab).
  // This is in order to match the style of the main component's state, with tabs.
  return (
    <Container>
      <UploadZoneWrapper>
        <UploadZone>
          <Row noGutters className="my-auto">
            <Col>
              <FileIconsContainer>
                <FileStatusIcon hasErrors={hasErrors} />
              </FileIconsContainer>
            </Col>
          </Row>

          <Row noGutters className="my-auto">
            <Col>
              <UploadZoneTextContainer>
                <UploadZoneDescription>{description}</UploadZoneDescription>
              </UploadZoneTextContainer>
            </Col>
          </Row>

          <Row noGutters className="my-auto">
            <Col>
              <UploadZoneButtonContainer>
                <UploadZoneButton color="secondary" onClick={onRemove}>
                  {t('Remove')}
                </UploadZoneButton>
              </UploadZoneButtonContainer>
            </Col>
          </Row>
        </UploadZone>
      </UploadZoneWrapper>

      <Row noGutters>
        <Col>
          {errors.map((error) => (
            <FileError key={error.message} error={error} />
          ))}
        </Col>
      </Row>
    </Container>
  )
}
