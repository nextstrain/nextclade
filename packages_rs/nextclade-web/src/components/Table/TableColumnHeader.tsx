import React, { useCallback, useMemo } from 'react'
import { Column, flexRender, Header, Table as ReactTable } from '@tanstack/react-table'
import { ConnectableElement, useDrag, useDrop } from 'react-dnd'
import styled from 'styled-components'
import { BsCaretDownFill as IconDown, BsCaretUpFill as IconUp } from 'react-icons/bs'

import { ButtonTransparent } from 'src/components/Common/ButtonTransparent'
import { getColumnName, reorderByValue } from './helpers'

const SORT_BUTTON_SIZE = '16px'
const SORT_BUTTON_ICON_SIZE = '8px'

const Th = styled.th<{ $width?: number; $isDragging?: boolean; $canDrop?: boolean; $isDragOver?: boolean }>`
  position: relative;
  width: ${(props) => props.$width}px;
  height: 45px;
  padding: 0 !important;
  margin: 0 !important;
  border: ${({ theme }) => `1px solid ${theme.gray700}`} !important;
  border-right: ${({ theme }) => `2px solid ${theme.gray600}`} !important;
  color: ${(props) => props.theme.gray100};
  background-color: ${({ $isDragOver, theme }) => ($isDragOver ? theme.gray600 : theme.gray700)};
  outline: ${({ $isDragOver, theme }) => $isDragOver && theme.outline.drop};
  opacity: ${({ $isDragging }) => ($isDragging ? 0.5 : 1.0)};
`

const ColumnHeaderContainer = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
`

const ColumnHeaderContent = styled.span`
  margin: auto;
  overflow: hidden;
  white-space: nowrap;
  background-color: transparent !important;
`

export const SortButtonWrapper = styled.div`
  flex: 1;
  text-align: center;
  align-items: center;
`

export const SortButton = styled(ButtonTransparent)<{ $highlight?: boolean }>`
  width: 30px;
  margin: auto;
  * {
    fill: ${({ $highlight, theme }) => ($highlight ? theme.primary : theme.gray600)};
  }
`

export interface ColumnHeaderResizerProps {
  $isResizing: boolean
  $deltaOffset?: number | null
}

const ColumnHeaderResizer = styled.span.attrs<ColumnHeaderResizerProps>(({ $isResizing, $deltaOffset }) => ({
  style: {
    transform: $isResizing && `translate(${$deltaOffset ?? 0}px)`,
  },
}))<ColumnHeaderResizerProps>`
  display: inline-block;
  position: absolute;
  right: -2.5px;
  top: 0;
  height: 100%;
  width: 5px;
  background-color: ${({ $isResizing, theme }) => $isResizing && theme.primary};
  cursor: col-resize;
  user-select: none;
  touch-action: none;
  z-index: 999;
`

export interface TableColumnHeaderProps<T> {
  header: Header<T, unknown>
  table: ReactTable<T>
}

export function TableColumnHeader<T>({ header, table }: TableColumnHeaderProps<T>) {
  const { getState, setColumnOrder } = table
  const { columnOrder } = getState()
  const { column, colSpan, isPlaceholder } = header

  const [{ canDrop, isDragOver }, dropRef] = useDrop({
    accept: 'column',
    drop: (draggedColumn: Column<T>) => {
      const newColumnOrder = reorderByValue(columnOrder, getColumnName(draggedColumn), getColumnName(column))
      setColumnOrder(newColumnOrder)
    },
    canDrop: () => true,
    collect: (monitor) => ({
      isDragOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  })

  const [{ isDragging }, dragRef, previewRef] = useDrag({
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    item: () => column,
    type: 'column',
  })

  const attachRef = useCallback(
    (element: ConnectableElement) => {
      dropRef(element)
      previewRef(element)
    },
    [dropRef, previewRef],
  )

  const canSort = column.getCanSort()
  const isAsc = column.getIsSorted() === 'asc'
  const isDesc = column.getIsSorted() === 'desc'

  const sortAsc = useCallback(() => {
    column.toggleSorting(false)
  }, [column])

  const sortDesc = useCallback(() => {
    column.toggleSorting(true)
  }, [column])

  const content = useMemo(() => {
    if (isPlaceholder) {
      return null
    }

    return (
      <ColumnHeaderContent>
        {canSort && (
          <div className="d-flex w-100">
            <SortButton height={SORT_BUTTON_SIZE} onClick={sortDesc} $highlight={isDesc}>
              <IconUp size={SORT_BUTTON_ICON_SIZE} />
            </SortButton>
          </div>
        )}

        <div className="w-100 text-center">{flexRender(column.columnDef.header, header.getContext())}</div>

        {canSort && (
          <div className="d-flex w-100">
            <SortButton height={SORT_BUTTON_SIZE} onClick={sortAsc} $highlight={isAsc}>
              <IconDown size={SORT_BUTTON_ICON_SIZE} />
            </SortButton>
          </div>
        )}
      </ColumnHeaderContent>
    )
  }, [canSort, column.columnDef.header, header, isAsc, isDesc, isPlaceholder, sortAsc, sortDesc])

  return (
    <Th
      ref={attachRef}
      colSpan={colSpan}
      $width={header.getSize()}
      $isDragging={isDragging}
      $canDrop={canDrop}
      $isDragOver={isDragOver}
    >
      <ColumnHeaderContainer ref={dragRef}>{content}</ColumnHeaderContainer>
      <ColumnHeaderResizer
        onMouseDown={header.getResizeHandler()}
        onTouchStart={header.getResizeHandler()}
        $isResizing={column.getIsResizing()}
        $deltaOffset={table.getState().columnSizingInfo.deltaOffset}
      />
    </Th>
  )
}
