import React, { ReactNode } from 'react'

import { useTranslation } from 'react-i18next'
import { Button, UncontrolledAlert } from 'reactstrap'
import { IoMdCheckmarkCircle, IoMdCloseCircle } from 'react-icons/io'

import { Tab as TabBase, TabList, TabPanel, Tabs, TextContainer } from 'src/components/Main/FilePickerTabs'

import { theme } from 'src/theme'
import styled from 'styled-components'

export const Tab = styled(TabBase)`
  display: none;
`

export const UploadZoneWrapper = styled.div`
  width: 100%;
  height: 100%;
`

export const UploadZone = styled.div`
  display: flex;
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
  margin-left: auto;
`

export const UploadZoneTextContainer = styled.div`
  display: block;
  margin: auto;
  margin-left: 20px;
`

export const UploadZoneDescription = styled.div`
  font-size: 1.1rem;
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

export const FileErrorStyled = styled(UncontrolledAlert)``

function FileStatusIcon({ hasErrors }: { hasErrors: boolean }) {
  const ICON_SIZE = 70

  if (hasErrors) {
    return <IoMdCloseCircle size={ICON_SIZE} color={theme.danger} />
  }

  return <IoMdCheckmarkCircle size={ICON_SIZE} color={theme.success} />
}

// TODO: handle errors
// function FileError({ error }: { error: string }) {
//   return <FileErrorStyled color="danger">{error}</FileErrorStyled>
// }

export interface UploadedFileInfoProps {
  name: ReactNode
  description: string
  errors: string[]

  onRemove(): void
}

export function UploadedFileInfo({ name, description, errors, onRemove }: UploadedFileInfoProps) {
  const { t } = useTranslation()

  const hasErrors = errors.length > 0

  // NOTE: This currently uses the Tab layout, even there's no tabs (1 invisible tab).
  // This is in order to match the style of the main component's state, with tabs.
  return (
    <Tabs>
      <TabList>
        <TextContainer>{name}</TextContainer>
        <Tab />
      </TabList>

      <TabPanel>
        <UploadZoneWrapper>
          <UploadZone>
            <UploadZoneLeft>
              <FileIconsContainer>
                <FileStatusIcon hasErrors={hasErrors} />
              </FileIconsContainer>
            </UploadZoneLeft>
            <UploadZoneRight>
              <UploadZoneTextContainer>
                <UploadZoneDescription>{description}</UploadZoneDescription>
                <UploadZoneButton color="secondary" onClick={onRemove}>
                  {t('Remove')}
                </UploadZoneButton>
              </UploadZoneTextContainer>
            </UploadZoneRight>
          </UploadZone>
        </UploadZoneWrapper>
      </TabPanel>
    </Tabs>
  )
}

// {errors.map((error) => (
// <FileError key={error} error={error} />
// ))}
