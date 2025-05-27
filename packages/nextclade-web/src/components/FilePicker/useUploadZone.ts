import { useState } from 'react'
import { FileRejection, useDropzone } from 'react-dropzone'
import { TFunc, useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { sanitizeError } from 'src/helpers/sanitizeError'
import { theme } from 'src/theme'
import { DefaultTheme } from 'styled-components'

export enum UploadZoneState {
  normal = 'normal',
  accept = 'accept',
  reject = 'reject',
  hover = 'hover',
}

export interface UseUploadZoneParams {
  onUpload(files: File[]): void
  multiple?: boolean
}

export function useUploadZone({ onUpload, multiple = false }: UseUploadZoneParams) {
  const { t } = useTranslationSafe()
  const [errors, setErrors] = useState<string[]>([])
  const hasErrors = errors.length > 0

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    onDrop: makeOnDrop({ t, onUpload, setErrors, multiple }),
    multiple,
  })

  let state = UploadZoneState.normal
  if (isDragAccept) state = UploadZoneState.accept
  else if (isDragReject) state = UploadZoneState.reject

  return { state, errors, hasErrors, getRootProps, getInputProps, isDragActive }
}

export interface MakeOnDropParams {
  t: TFunc
  onUpload(files: File[]): void
  setErrors(updateErrors: string[] | ((prevErrors: string[]) => string[])): void
  multiple: boolean
}

export function makeOnDrop({ t, onUpload, setErrors, multiple }: MakeOnDropParams) {
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
    if ((!multiple && nFiles > 1) || (!multiple && acceptedFiles.length > 1)) {
      throw new UploadErrorTooManyFiles(nFiles)
    }
    onUpload(acceptedFiles)
  }

  async function onDrop(acceptedFiles: File[], rejectedFiles: FileRejection[]) {
    setErrors([])
    try {
      await processFiles(acceptedFiles, rejectedFiles)
    } catch (error: unknown) {
      handleError(sanitizeError(error))
    }
  }

  return (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    // eslint-disable-next-line no-void
    void onDrop(acceptedFiles, rejectedFiles)
  }
}

export type UploadZoneElems = keyof typeof theme.uploadZone

export function getUploadZoneTheme(props: { state: UploadZoneState; theme: DefaultTheme }, elem: UploadZoneElems) {
  return props.theme.uploadZone[elem][props.state]
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
