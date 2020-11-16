import React from 'react'

import { connect } from 'react-redux'
import { DropEvent, FileRejection, useDropzone } from 'react-dropzone'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'

import type { State } from 'src/state/reducer'
import type { FileStats } from 'src/state/algorithm/algorithm.state'
import { formatFileStats } from 'src/helpers/formatFileStats'
import { FileIconFasta, FileIconTxt } from 'src/components/Main/UploaderFileIcons'

export interface UploadZoneProps {
  inputFile?: FileStats

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

  const file = inputFile && <div className="mx-auto text-center">{formatFileStats(inputFile)}</div>

  return (
    <div {...getRootProps()}>
      <input type="file" {...getInputProps()} />

      <div className={classNames('d-flex', 'upload-zone', isDragActive && 'upload-zone-active')}>
        <div className="mx-auto my-auto text-center">
          <FileIconFasta />
          <FileIconTxt />
          <div className="mt-4">{file ?? (isDragActive ? active : normal)}</div>
        </div>
      </div>
    </div>
  )
}
