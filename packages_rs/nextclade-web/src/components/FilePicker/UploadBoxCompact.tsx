import React, { PropsWithChildren, useMemo } from 'react'
import { Button } from 'reactstrap'
import styled from 'styled-components'
import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'

import { getUploadZoneTheme, UploadZoneState, useUploadZone } from 'src/components/FilePicker/useUploadZone'
import { appendDash } from 'src/helpers/appendDash'

export const UploadZoneWrapper = styled.div`
  display: flex;
  flex-direction: row;

  width: 100%;
  height: 100%;

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
  min-height: 57px;
  border-radius: 5px;
  border: ${(props) => getUploadZoneTheme(props, 'border')};
  color: ${(props) => getUploadZoneTheme(props, 'color')};
  background-color: ${(props) => getUploadZoneTheme(props, 'background')};
  box-shadow: ${(props) => getUploadZoneTheme(props, 'box-shadow')};
`

export const UploadZoneInput = styled.input``

export const UploadZoneLeft = styled.div`
  display: flex;
  flex: 0 0;
  height: 100%;
`

export const UploadZoneRight = styled.div`
  display: flex;
  flex: 1 1 100%;
  height: 100%;
`

export const UploadZoneTextContainer = styled.div`
  flex: 1;
  display: flex;
`

export const UploadZoneText = styled.span`
  flex: 1;
  margin: auto;
  text-align: center;
  font-size: 1.1rem;
`

export const UploadZoneButton = styled(Button)`
  flex: 0 0 120px;
  margin-left: auto;
`

export interface UploaderCompactProps {
  onUpload(files: File[]): void
}

export function UploadBoxCompact({ onUpload, children, ...props }: PropsWithChildren<UploaderCompactProps>) {
  const { t } = useTranslation()
  const { state, errors, hasErrors, getRootProps, getInputProps, isDragActive } = useUploadZone({
    onUpload,
    multiple: true,
  })

  if (hasErrors) {
    console.warn(`Errors when uploading:\n${errors.map(appendDash).join('\n')}`)
  }

  const normal = useMemo(
    () => (
      <UploadZoneTextContainer>
        <UploadZoneText>{t('Drag & drop a file ')}</UploadZoneText>
        <UploadZoneButton color="primary">{t('Select a file')}</UploadZoneButton>
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
    <UploadZoneWrapper {...getRootProps()} {...props} title={t('Drag & drop or select a file')}>
      <UploadZoneInput type="file" {...getInputProps()} />
      <UploadZoneLeft>{children}</UploadZoneLeft>
      <UploadZoneRight>
        <UploadZone state={state}>{isDragActive ? active : normal}</UploadZone>
      </UploadZoneRight>
    </UploadZoneWrapper>
  )
}
