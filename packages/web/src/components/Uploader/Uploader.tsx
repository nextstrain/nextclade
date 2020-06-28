import React, { useState } from 'react'

import { FileRejection } from 'react-dropzone'
import { useTranslation } from 'react-i18next'
import { UncontrolledAlert } from 'reactstrap'

import { appendDash } from 'src/helpers/appendDash'
import { readFile, FileReaderError } from 'src/helpers/readFile'

import { UploadZone } from './UploadZone'

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

export interface UploaderProps {
  onUpload(content: string, filename: string, size: number): void
}

export function Uploader({ onUpload }: UploaderProps) {
  const { t } = useTranslation()
  const [errors, setErrors] = useState<string[]>([])

  const hasErrors = errors.length > 0

  if (hasErrors) {
    console.warn(`Errors when uploading:\n${errors.map(appendDash).join('\n')}`)
  }

  function handleError(error: Error) {
    if (error instanceof UploadErrorTooManyFiles) {
      setErrors((prevErrors) => [...prevErrors, t('Only one file is expected')])
    } else if (error instanceof UploadErrorUnknown) {
      setErrors((prevErrors) => [...prevErrors, t('Unknown error')])
    } else if (error instanceof FileReaderError) {
      setErrors((prevErrors) => [...prevErrors, t('Unable to read file.')])
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
    const str = await readFile(file)
    onUpload(str, file.name, file.size)
  }

  async function onDrop(acceptedFiles: File[], rejectedFiles: FileRejection[]) {
    setErrors([])

    try {
      await processFiles(acceptedFiles, rejectedFiles)
    } catch (error) {
      handleError(error)
      return
    }

    setErrors([])
  }

  return (
    <div className="uploader-container">
      <div className="">
        <UploadZone onDrop={onDrop} />
      </div>

      <div className="mt-3 uploader-error-list">
        {hasErrors && (
          <>
            <h4 className="mt-2 text-danger">{t(`Error`)}</h4>
            {errors.map((error) => (
              <UncontrolledAlert color="danger" className="uploader-error-list-item" key={error}>
                {error}
              </UncontrolledAlert>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
