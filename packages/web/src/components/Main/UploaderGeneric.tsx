import { TFunction } from 'i18next'
import React, { PropsWithChildren, useState } from 'react'

import { FileRejection, useDropzone } from 'react-dropzone'
import { useTranslation } from 'react-i18next'

import { appendDash } from 'src/helpers/appendDash'
import styled, { DefaultTheme } from 'styled-components'

import { formatFileText } from './UploadZone'

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

export interface UploaderGenericProps {
  onUpload(file: File): void
}

export function getUploadZoneTheme(props: { state: UploadZoneState; theme: DefaultTheme }, elem: 'border' | 'color') {
  return props.theme.uploadZone[elem][props.state]
}

export const UploadZone = styled.div<{ state: UploadZoneState }>`
  height: 100px;
  cursor: pointer;
  border-radius: 5px;
  border: ${(props) => getUploadZoneTheme(props, 'border')};
  color: ${(props) => getUploadZoneTheme(props, 'color')}; ;
`

export function UploaderGeneric({ onUpload, children }: PropsWithChildren<UploaderGenericProps>) {
  const { t } = useTranslation()
  const [errors, setErrors] = useState<string[]>([])
  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    onDrop: makeOnDrop({ t, onUpload, setErrors }),
    noClick: true,
    multiple: false,
  })

  const hasErrors = errors.length > 0

  if (hasErrors) {
    console.warn(`Errors when uploading:\n${errors.map(appendDash).join('\n')}`)
  }

  let state = UploadZoneState.normal
  if (isDragAccept) state = UploadZoneState.accept
  else if (isDragReject) state = UploadZoneState.reject

  const normal = <div className="mx-auto text-center">{t('Drag & Drop a file or click to select')}</div>

  const active = <div className="mx-auto text-center">{t('Drop it!')}</div>

  const inputFile = undefined
  const file = inputFile && <div className="mx-auto text-center">{formatFileText(inputFile)}</div>

  return (
    <div>
      <div {...getRootProps()}>
        <input type="file" {...getInputProps()} />
        <UploadZone state={state}>
          {children}
          <div className="mt-4">{file ?? (isDragActive ? active : normal)}</div>
        </UploadZone>
      </div>
    </div>
  )
}
