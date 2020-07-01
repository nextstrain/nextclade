import React from 'react'

import { connect } from 'react-redux'
import { DropEvent, FileRejection, useDropzone } from 'react-dropzone'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import FileIcon, { defaultStyles } from 'react-file-icon'

import { numbro } from 'src/i18n/i18n'

import { State } from 'src/state/reducer'
import { InputFile } from 'src/state/algorithm/algorithm.state'

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

export function formatFileText(inputFile: InputFile) {
  const size = numbro(inputFile.size).format({ output: 'byte', base: 'decimal', spaceSeparated: true, mantissa: 1 })
  return `${inputFile.name} (${size})`
}

export interface UploadZoneProps {
  inputFile?: InputFile
  onDrop<T extends File>(acceptedFiles: T[], fileRejections: FileRejection[], event: DropEvent): void
}

const mapStateToProps = (state: State) => ({
  inputFile: state.algorithm.inputFile,
})

const mapDispatchToProps = {}

export const UploadZone = connect(mapStateToProps, mapDispatchToProps)(UploadZoneDisconnected)

export function UploadZoneDisconnected({ inputFile, onDrop }: UploadZoneProps) {
  const { t } = useTranslation()
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: false })

  const normal = <div className="mx-auto text-center">{t('Drag & Drop a file or click to select')}</div>

  const active = <div className="mx-auto text-center">{t('Drop it!')}</div>

  const file = inputFile && <div className="mx-auto text-center">{formatFileText(inputFile)}</div>

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
          <div className="mt-4">{file || (isDragActive ? active : normal)}</div>
        </div>
      </div>
    </div>
  )
}
