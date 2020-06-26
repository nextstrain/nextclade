import React from 'react'

import { DropEvent, FileRejection, useDropzone } from 'react-dropzone'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import FileIcon, { defaultStyles } from 'react-file-icon'

export const FileIconFasta = () => (
  <FileIcon
    {...defaultStyles.txt}
    size={50}
    extension="fasta"
    type="code2"
    labelColor={'#66b51d'}
    glyphColor={'#66b51d'}
    labelUppercase
  />
)

export const FileIconTxt = () => (
  <FileIcon
    {...defaultStyles.txt}
    className="file-icon"
    size={50}
    extension="txt"
    labelColor={'#777777'}
    glyphColor={'#777777'}
    labelUppercase
  />
)

export interface UploadZoneProps {
  onDrop<T extends File>(acceptedFiles: T[], fileRejections: FileRejection[], event: DropEvent): void
}

export function UploadZone({ onDrop }: UploadZoneProps) {
  const { t } = useTranslation()
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: false })

  const normal = <div className="mx-auto text-center">{t('Drag & Drop a file or click to select')}</div>

  const active = <div className="mx-auto text-center">{t('Drop it!')}</div>

  return (
    <div {...getRootProps()}>
      <input type="file" {...getInputProps()} />

      <div className={classNames('d-flex', 'upload-zone', isDragActive && 'upload-zone-active')}>
        <div className="mx-auto my-auto text-center">
          <div className="mx-auto">
            <span className="mr-2 file-icon">
              <FileIconFasta />
            </span>
            <span className="ml-2 file-icon">
              <FileIconTxt />
            </span>
          </div>
          <div className="mt-4">{isDragActive ? active : normal}</div>
        </div>
      </div>
    </div>
  )
}
