import React from 'react'

import { useTranslation } from 'react-i18next'
import { Alert, Button, Col, Row } from 'reactstrap'
import { IoMdCheckmarkCircle, IoMdCloseCircle } from 'react-icons/io'
import { FlexCenter } from 'src/components/FilePicker/FilePickerStyles'
import styled from 'styled-components'

import { theme } from 'src/theme'
import { ErrorContent } from 'src/components/Error/ErrorPopup'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
`

export const InfoWrapper = styled.div`
  width: 100%;
  height: 100%;
  border: ${(props) => props.theme.filePicker.border.normal};
  border-radius: ${(props) => props.theme.filePicker.borderRadius};
  margin-bottom: 1rem;
  min-height: ${(props) => props.theme.filePicker.minHeight};
`

export const InfoWrapperInternal = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  margin: auto;
`

export const ErrorWrapper = styled.div`
  width: 100%;
  height: 100%;
`

export const ErrorWrapperInternal = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  margin: auto;
`

export const IconsContainer = styled.div`
  text-align: center;
`

export const TextContainer = styled.div`
  display: block;
  margin: auto;
  text-align: center;
`

export const ButtonContainer = styled.div`
  text-align: center;
`

export const Description = styled.div`
  font-size: 1.1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
`

// export const UploadZoneTextOr = styled.div`
//   margin-top: 10px;
//   font-size: 0.9rem;
//   font-weight: light;
// `

export const RemoveButton = styled(Button)`
  margin-top: 10px;
  min-width: 160px;
  min-height: 50px;
`

export const FileErrorStyled = styled(Alert)`
  display: flex;
  text-align: left;
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

  return (
    <Container>
      <InfoWrapper>
        <InfoWrapperInternal>
          <Row noGutters className="my-auto">
            <Col>
              <IconsContainer>
                <FileStatusIcon hasErrors={hasErrors} />
              </IconsContainer>
            </Col>
          </Row>

          <Row noGutters className="my-auto">
            <Col>
              <TextContainer>
                <Description>{description}</Description>
              </TextContainer>
            </Col>
          </Row>

          <Row noGutters className="my-auto">
            <Col>
              <ButtonContainer>
                <RemoveButton color="secondary" onClick={onRemove}>
                  {t('Remove')}
                </RemoveButton>
              </ButtonContainer>
            </Col>
          </Row>
        </InfoWrapperInternal>
      </InfoWrapper>

      <ErrorWrapper>
        <ErrorWrapperInternal>
          {errors.map((error) => (
            <FileError key={error.message} error={error} />
          ))}
        </ErrorWrapperInternal>
      </ErrorWrapper>
    </Container>
  )
}
