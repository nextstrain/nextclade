import React from 'react'
import { defaultStyles, FileIcon } from 'react-file-icon'
import { FileIconContainer } from 'src/components/Main/UploadZone'

export const FileIconJson = () => (
  <FileIconContainer className="mx-auto">
    <FileIcon {...defaultStyles.json} extension="json" labelColor={'#bb7e38'} glyphColor={'#bb7e38'} labelUppercase />
  </FileIconContainer>
)
