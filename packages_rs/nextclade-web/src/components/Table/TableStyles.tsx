import React, { ReactNode } from 'react'
import styled from 'styled-components'
import { CellContext } from '@tanstack/react-table'

export const ROW_HEIGHT = 30

export const HEADER_ROW_HEIGHT = 75

export const Table = styled.div``

export const Trh = styled.div<{
  $isDragging?: boolean
  $canDrop?: boolean
  $isDragOver?: boolean
}>`
  position: sticky !important;
  top: 0 !important;
  left: 0 !important;
  z-index: 999 !important;

  display: flex;
  flex: 1;

  overflow: hidden;
`

export const Th = styled.div<{
  $fullWidth?: boolean
  $width: number
  $isDragging?: boolean
  $canDrop?: boolean
  $isDragOver?: boolean
}>`
  flex: ${(props) => (props.$fullWidth ? `1` : `0 0 ${props.$width}px`)};
  width: ${(props) => props.$width}px;

  color: ${(props) => props.theme.gray100};
  background-color: ${({ $isDragOver, theme }) => ($isDragOver ? theme.gray600 : theme.gray700)};
  opacity: ${({ $isDragging }) => ($isDragging ? 0.5 : 1.0)};

  font-weight: normal;
  font-size: 0.85rem;

  padding: 0;
  margin: 0;
  border-right: ${({ theme }) => `1px solid ${theme.gray600}`} !important;
  border-left: ${({ theme }) => `1px solid ${theme.gray600}`} !important;

  /* Mitigates react-dnd incorrect preview bug in Chrome: https://github.com/react-dnd/react-dnd/issues/1608#issuecomment-573498437 */
  transform: translateZ(0);
`

export const TableMain = styled.div`
  position: relative;
`

export const Tr = styled.div<{
  $isEven?: boolean
  $isDragging?: boolean
  $canDrop?: boolean
  $isDragOver?: boolean
}>`
  display: flex;
  height: ${ROW_HEIGHT}px;

  opacity: ${({ $isDragging }) => ($isDragging ? 0.5 : 1.0)};

  background-color: ${({ $isEven, theme }) => ($isEven ? theme.gray250 : theme.gray100)};
`

export const Td = styled.div<{
  $left: number
  $fullWidth: boolean
  $width: number
  $isHighlighted?: boolean
}>`
  flex: ${(props) => (props.$fullWidth ? `1` : `0 0 ${props.$width}px`)};

  border-left: ${(props) => `1px solid ${props.theme.gray300}`};

  overflow: hidden;
  white-space: nowrap;

  align-items: center;
  text-align: center;
  vertical-align: middle;

  font-weight: normal;
  font-size: 0.85rem;
`

export const Trf = styled.div<{
  $isDragging?: boolean
  $canDrop?: boolean
  $isDragOver?: boolean
}>`
  position: sticky !important;
  bottom: 0 !important;
  left: 0 !important;
  z-index: 999 !important;

  display: flex;
  flex: 1;
`

export const TextLeft = styled.div`
  text-align: left;
  vertical-align: middle;
`

export const TextCenter = styled.div`
  text-align: center;
  vertical-align: middle;
`

export const TextRight = styled.div`
  text-align: right;
  vertical-align: middle;
`

export function alignLeft<T, U>(context: CellContext<T, U>) {
  return <TextCenter>{context.getValue<ReactNode>()}</TextCenter>
}

export function alignCenter<T, U>(context: CellContext<T, U>) {
  return <TextCenter>{context.getValue<ReactNode>()}</TextCenter>
}

export function alignRight<T, U>(context: CellContext<T, U>) {
  return <TextRight>{context.getValue<ReactNode>()}</TextRight>
}
