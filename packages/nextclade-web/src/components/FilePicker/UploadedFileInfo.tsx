import React, { useMemo } from 'react'
import { isNil } from 'lodash'
import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'
import { Alert, Button, Col, Row } from 'reactstrap'
import { IoMdCheckmarkCircle, IoMdCloseCircle } from 'react-icons/io'
import styled from 'styled-components'

import { theme } from 'src/theme'
import { ErrorContent } from 'src/components/Error/ErrorContent'

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
  margin-top: 1rem;
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

function FileError({ error }: { error?: string }) {
  return (
    <FileErrorStyled color="danger">
      <ErrorContent error={error} />
    </FileErrorStyled>
  )
}

export interface UploadedFileInfoProps {
  description: string
  error?: string
  onRemove(): void
}

export function UploadedFileInfo({ description, error, onRemove }: UploadedFileInfoProps) {
  const { t } = useTranslation()

  const hasErrors = !isNil(error)

  const errorComponent = useMemo(
    () =>
      error && (
        <ErrorWrapper>
          <ErrorWrapperInternal>
            <FileError key={error} error={error} />
          </ErrorWrapperInternal>
        </ErrorWrapper>
      ),
    [error],
  )

  return (
    <Container>
      <InfoWrapper>
        <InfoWrapperInternal>
          <Row className="my-auto">
            <Col>
              <IconsContainer>
                <FileStatusIcon hasErrors={hasErrors} />
              </IconsContainer>
            </Col>
          </Row>

          <Row className="my-auto">
            <Col>
              <TextContainer>
                <Description>{description}</Description>
              </TextContainer>
            </Col>
          </Row>

          <Row className="my-auto">
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

      {errorComponent}
    </Container>
  )
}
