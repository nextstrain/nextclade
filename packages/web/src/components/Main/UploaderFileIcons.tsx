import React, { useMemo } from 'react'

import { get } from 'lodash'
import styled from 'styled-components'
import {
  defaultStyles,
  FileExtension,
  FileIcon as ReactFileIcon,
  FileIconProps as ReactFileIconProps,
  IconGlyphType,
  Styles,
} from 'react-file-icon'

export const DEFAULT_ICON_SIZE = 50 as const

export const DEFAULT_ICON_COLORS = {
  fasta: '#66b51d',
  csv: '#777777',
  json: '#bb7e38',
} as const

export const FileIconContainer = styled.i<{ width: number; height?: number }>`
  display: block;
  width: ${({ width }) => width}px;
  height: ${({ height }) => height && `${height}px`};
  margin: 3px 15px;
  filter: drop-shadow(${(props) => props.theme.shadows.filter.medium});
`

export const FileIconStyled = styled(ReactFileIcon)<ReactFileIconProps & { width: number; height?: number }>`
  display: inline;
  width: ${({ width }) => width}px;
  height: ${({ height }) => height && `${height}px`};
  max-width: 100%;
  max-height: 100%;
`

export interface FileIconBaseProps {
  size?: number
  extension: FileExtension | string
  type?: IconGlyphType
  labelColor?: string
  glyphColor?: string
}

export const FileIconBase = ({
  size = DEFAULT_ICON_SIZE,
  extension,
  type,
  labelColor,
  glyphColor,
}: FileIconBaseProps) => {
  const styles = useMemo(
    () => get<Styles, FileExtension>(defaultStyles, extension as FileExtension) ?? defaultStyles.txt,
    [extension],
  )

  const typeMaybe = type ?? styles?.type ?? ('txt' as IconGlyphType)

  return (
    <FileIconContainer width={size} height={(size * 48) / 40}>
      <FileIconStyled
        {...styles}
        width={size}
        height={(size * 48) / 40}
        extension={extension}
        type={typeMaybe}
        radius={3}
        color={'white'}
        labelColor={labelColor}
        glyphColor={glyphColor}
        labelUppercase
      />
    </FileIconContainer>
  )
}

export interface FileIconProps {
  size?: number
}

export const FileIconFasta = ({ size }: FileIconProps) => (
  <FileIconBase
    size={size}
    extension={'fasta'}
    type={'code2'}
    labelColor={DEFAULT_ICON_COLORS.fasta}
    glyphColor={DEFAULT_ICON_COLORS.fasta}
  />
)

export const FileIconJson = ({ size }: FileIconProps) => (
  <FileIconBase
    size={size}
    extension={'json'}
    labelColor={DEFAULT_ICON_COLORS.json}
    glyphColor={DEFAULT_ICON_COLORS.json}
  />
)

export const FileIconCsv = ({ size }: FileIconProps) => (
  <FileIconBase
    size={size}
    extension={'csv'}
    labelColor={DEFAULT_ICON_COLORS.csv}
    glyphColor={DEFAULT_ICON_COLORS.csv}
  />
)
