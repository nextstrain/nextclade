import React, { PropsWithChildren, useMemo } from 'react'
import { Button } from 'reactstrap'
import styled from 'styled-components'
import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'

import { getUploadZoneTheme, UploadZoneState, useUploadZone } from 'src/components/FilePicker/useUploadZone'
import { appendDash } from 'src/helpers/appendDash'

export const UploadZoneWrapper = styled.div`
  width: 100%;

  &:focus-within {
    border: none;
    inset: unset;
    border-image: none;
  }
`

export const UploadZone = styled.div<{ state: UploadZoneState }>`
  display: flex;
  width: 100%;
  height: 100%;
  cursor: pointer;
  min-height: ${(props) => props.theme.filePicker.minHeight};
  border-radius: ${(props) => props.theme.filePicker.borderRadius};
  border: ${(props) => getUploadZoneTheme(props, 'border')};
  color: ${(props) => getUploadZoneTheme(props, 'color')};
  background-color: ${(props) => getUploadZoneTheme(props, 'background')};
  box-shadow: ${(props) => getUploadZoneTheme(props, 'box-shadow')};
`

export const UploadZoneInput = styled.input``

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

export const UploadZoneText = styled.div`
  font-size: 1.1rem;
  text-align: center;
  max-width: 150px;
`

export const UploadZoneButton = styled(Button)`
  margin-top: 10px;
  min-width: 160px;
  min-height: 50px;
`

export interface UploadBoxProps {
  onUpload(files: File[]): void
  multiple?: boolean
}

export function UploadBox({ onUpload, children, multiple = false, ...props }: PropsWithChildren<UploadBoxProps>) {
  const { t } = useTranslation()
  const { state, errors, hasErrors, getRootProps, getInputProps, isDragActive } = useUploadZone({
    onUpload,
    multiple,
  })

  if (hasErrors) {
    console.warn(`Errors when uploading:\n${errors.map(appendDash).join('\n')}`)
  }

  const normal = useMemo(
    () => (
      <UploadZoneTextContainer>
        <UploadZoneText>{t('Drag & drop files or folders')}</UploadZoneText>
        <UploadZoneButton color="primary">{t('Select files')}</UploadZoneButton>
      </UploadZoneTextContainer>
    ),
    [t],
  )

  const active = useMemo(
    () => (
      <UploadZoneTextContainer>
        <UploadZoneText>{t('Drop it!')}</UploadZoneText>
      </UploadZoneTextContainer>
    ),
    [t],
  )

  return (
    <UploadZoneWrapper {...getRootProps()} {...props} title={t('Drag & drop or select files')}>
      <UploadZoneInput type="file" {...getInputProps()} />
      <UploadZone state={state}>
        <UploadZoneLeft>{<FileIconsContainer>{children}</FileIconsContainer>}</UploadZoneLeft>
        <UploadZoneRight>{isDragActive ? active : normal}</UploadZoneRight>
      </UploadZone>
    </UploadZoneWrapper>
  )
}
