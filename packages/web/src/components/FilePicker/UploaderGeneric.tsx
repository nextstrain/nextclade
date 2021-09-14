import React, { PropsWithChildren, useMemo, useState } from 'react'

import type { TFunction } from 'i18next'
import { Button } from 'reactstrap'
import styled, { DefaultTheme } from 'styled-components'
import { FileRejection, useDropzone } from 'react-dropzone'
import { useTranslation } from 'react-i18next'

import { theme } from 'src/theme'
import { appendDash } from 'src/helpers/appendDash'

export type UpdateErrorsFunction = (prevErrors: string[]) => string[]

export interface MakeOnDropParams {
  t: TFunction

  onUpload(file: File): void

  setErrors(updateErrors: string[] | UpdateErrorsFunction): void
}

export function makeOnDrop({ t, onUpload, setErrors }: MakeOnDropParams) {
  function handleError(error: Error) {
    if (error instanceof UploadErrorTooManyFiles) {
      setErrors((prevErrors) => [...prevErrors, t('Only one file is expected')])
    } else if (error instanceof UploadErrorUnknown) {
      setErrors((prevErrors) => [...prevErrors, t('Unknown error')])
    } else {
      throw error
    }
  }

  async function processFiles(acceptedFiles: File[], rejectedFiles: FileRejection[]) {
    const nFiles = acceptedFiles.length + rejectedFiles.length

    if (nFiles > 1) {
      throw new UploadErrorTooManyFiles(nFiles)
    }

    if (acceptedFiles.length !== 1) {
      throw new UploadErrorTooManyFiles(acceptedFiles.length)
    }

    const file = acceptedFiles[0]
    onUpload(file)
  }

  return async function onDrop(acceptedFiles: File[], rejectedFiles: FileRejection[]) {
    setErrors([])
    try {
      await processFiles(acceptedFiles, rejectedFiles)
    } catch (error) {
      handleError(error)
    }
  }
}

export enum UploadZoneState {
  normal = 'normal',
  accept = 'accept',
  reject = 'reject',
  hover = 'hover',
}

class UploadErrorTooManyFiles extends Error {
  public readonly nFiles: number

  constructor(nFiles: number) {
    super(`when uploading: one file is expected, but got ${nFiles}`)
    this.nFiles = nFiles
  }
}

class UploadErrorUnknown extends Error {
  constructor() {
    super(`when uploading: unknown error`)
  }
}

export type UploadZoneElems = keyof typeof theme.uploadZone

export function getUploadZoneTheme(props: { state: UploadZoneState; theme: DefaultTheme }, elem: UploadZoneElems) {
  return props.theme.uploadZone[elem][props.state]
}

export const UploadZoneWrapper = styled.div`
  width: 100%;
  height: 100%;

  &:focus-within {
    border: none;
    inset: none;
    border-image: none;
  }
`

export const UploadZone = styled.div<{ state: UploadZoneState }>`
  display: flex;
  height: 100%;
  cursor: pointer;
  border-radius: 5px;
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
`

export const UploadZoneTextOr = styled.div`
  margin-top: 10px;
  font-size: 0.9rem;
  font-weight: light;
  text-align: center;
`

export const UploadZoneButton = styled(Button)`
  margin-top: 10px;
  min-width: 160px;
  min-height: 50px;
`

export interface UploaderGenericProps {
  onUpload(file: File): void
}

export function UploaderGeneric({ onUpload, children }: PropsWithChildren<UploaderGenericProps>) {
  const { t } = useTranslation()
  const [errors, setErrors] = useState<string[]>([])

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    onDrop: makeOnDrop({ t, onUpload, setErrors }),
    multiple: false,
  })

  const hasErrors = errors.length > 0

  if (hasErrors) {
    console.warn(`Errors when uploading:\n${errors.map(appendDash).join('\n')}`)
  }

  let state = UploadZoneState.normal
  if (isDragAccept) state = UploadZoneState.accept
  else if (isDragReject) state = UploadZoneState.reject

  const normal = useMemo(
    () => (
      <UploadZoneTextContainer>
        <UploadZoneText>{t('Drag & Drop a file here')}</UploadZoneText>
        <UploadZoneTextOr>{t('or')}</UploadZoneTextOr>
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
    <UploadZoneWrapper {...getRootProps()}>
      <UploadZoneInput type="file" {...getInputProps()} />
      <UploadZone state={state}>
        <UploadZoneLeft>{<FileIconsContainer>{children}</FileIconsContainer>}</UploadZoneLeft>
        <UploadZoneRight>{isDragActive ? active : normal}</UploadZoneRight>
      </UploadZone>
    </UploadZoneWrapper>
  )
}
