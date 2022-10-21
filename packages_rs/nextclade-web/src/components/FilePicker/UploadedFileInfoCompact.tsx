import { isNil } from 'lodash'
import React, { ReactNode, useMemo } from 'react'
import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'
import { Alert, Button, Col, Row } from 'reactstrap'
import { IoMdCheckmarkCircle, IoMdCloseCircle } from 'react-icons/io'
import styled from 'styled-components'

import { UploadZoneTextContainer } from 'src/components/FilePicker/UploadBoxCompact'
import { ErrorWrapper, ErrorWrapperInternal } from 'src/components/FilePicker/UploadedFileInfo'
import { theme } from 'src/theme'
import { ErrorContent } from 'src/components/Error/ErrorContent'

export const Wrapper = styled.div`
  display: flex;
  flex-direction: row;

  width: 100%;
  height: 100%;

  &:focus-within {
    border: none;
    inset: none;
    border-image: none;
  }
`

export const Left = styled.div`
  display: flex;
  flex: 0 0;
  height: 100%;
`

export const Right = styled.div`
  display: flex;
  flex: 1 1 100%;
  height: 100%;
`

export const ContentWrapper = styled.div<{ $hasErrors: boolean }>`
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 57px;
  cursor: pointer;
  border: 4px
    ${({ theme, $hasErrors }) => ($hasErrors ? theme.uploadZone.background.reject : theme.uploadZone.background.accept)}
    solid;
  background-color: ${({ theme, $hasErrors }) =>
    $hasErrors ? theme.uploadZone.background.reject : theme.uploadZone.background.accept};
  border-radius: 5px;
`

export const UploadZoneText = styled.span`
  display: flex;
  flex: 1 1 100%;
  margin: auto;
  text-align: center;
  font-size: 1.1rem;
`

export const FileIconsContainer = styled.div`
  flex: 0 0 50px;
  margin: auto;
  margin-left: 7px;
`

export const UploadZoneButton = styled(Button)`
  flex: 0 0 120px;
  margin-left: auto;
`

export const UploadZoneDescription = styled.div`
  font-size: 1.1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: auto 0;
`

export const UploadZoneTextOr = styled.div`
  margin-top: 10px;
  font-size: 0.9rem;
  font-weight: light;
`

export const FileErrorStyled = styled(Alert)`
  display: flex;
  text-align: left;
  margin: 5px auto;
  max-width: 600px;
  box-shadow: ${(props) => props.theme.shadows.slight};
`

function FileStatusIcon({ hasErrors }: { hasErrors: boolean }) {
  const ICON_SIZE = 30

  if (hasErrors) {
    return <IoMdCloseCircle size={ICON_SIZE} color={theme.danger} />
  }

  return <IoMdCheckmarkCircle size={ICON_SIZE} color={theme.success} />
}

function FileError({ error }: { error: string }) {
  return (
    <FileErrorStyled color="danger">
      <ErrorContent error={error} />
    </FileErrorStyled>
  )
}

export interface UploadedFileInfoCompactProps {
  children?: ReactNode
  description: string
  error?: string
  onRemove(): void
}

export function UploadedFileInfoCompact({ children, description, error, onRemove }: UploadedFileInfoCompactProps) {
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

  // NOTE: This currently uses the Tab layout, even there's no tabs (1 invisible tab).
  // This is in order to match the style of the main component's state, with tabs.
  return (
    <Row noGutters>
      <Col>
        <Row noGutters>
          <Col>
            <Wrapper>
              <Left>{children}</Left>
              <Right>
                <ContentWrapper $hasErrors={hasErrors}>
                  <FileIconsContainer>
                    <FileStatusIcon hasErrors={hasErrors} />
                  </FileIconsContainer>

                  <UploadZoneTextContainer>
                    <UploadZoneText>{description}</UploadZoneText>
                    <UploadZoneButton color="secondary" onClick={onRemove}>
                      {t('Remove')}
                    </UploadZoneButton>
                  </UploadZoneTextContainer>
                </ContentWrapper>
              </Right>
            </Wrapper>
          </Col>
        </Row>

        {errorComponent}
      </Col>
    </Row>
  )
}
