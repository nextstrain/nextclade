import React, { ReactNode } from 'react'
import { Container, Table as TableBase } from 'reactstrap'
import styled from 'styled-components'
import { CellContext } from '@tanstack/react-table'

export const TableWrapper = styled(Container)`
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 0;
`

export const TableContainer = styled.div`
  width: 100%;
  margin: 0 auto;
  height: 500px;
  overflow: hidden auto;
`

export const TableStyled = styled(TableBase)`
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
  width: 100%;
`

export const Thead = styled.thead`
  margin: 0;
  position: sticky;
  top: 0;
  background-color: ${(props) => props.theme.gray650};
`

export const Tbody = styled.tbody``

export const Tr = styled.tr<{
  $isHighlighted?: boolean
  $isDragging?: boolean
  $canDrop?: boolean
  $isDragOver?: boolean
}>`
  cursor: pointer;
  background-color: ${({ $isHighlighted, theme }) => $isHighlighted && theme.primary};
  outline: ${({ $isDragOver, theme }) => $isDragOver && theme.outline.drop};
  opacity: ${({ $isDragging }) => ($isDragging ? 0.5 : 1.0)};
  line-height: 1;

  :nth-child(odd) {
    background-color: ${({ $isHighlighted, theme }) => !$isHighlighted && theme.gray100};
  }

  :nth-child(even) {
    background-color: ${({ $isHighlighted, theme }) => !$isHighlighted && theme.gray250};
  }
`

export const Td = styled.td<{ $isHighlighted?: boolean }>`
  overflow: hidden;
  white-space: nowrap;
  color: ${({ $isHighlighted, theme }) => $isHighlighted && theme.white} !important;
  border-left: ${(props) => !props.$isHighlighted && `1px solid ${props.theme.gray300}`};
`

export const TextCenter = styled.div`
  text-align: center;
`

export const TextRight = styled.div`
  text-align: right;
`

export function alignCenter<T, U>(context: CellContext<T, U>) {
  return <TextCenter>{context.getValue<ReactNode>()}</TextCenter>
}

export function alignRight<T, U>(context: CellContext<T, U>) {
  return <TextRight>{context.getValue<ReactNode>()}</TextRight>
}
