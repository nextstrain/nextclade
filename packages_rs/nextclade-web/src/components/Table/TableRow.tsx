import React, { useCallback } from 'react'
import { flexRender, Row as ReactTableRow } from '@tanstack/react-table'
import { ConnectableElement, useDrag, useDrop } from 'react-dnd'
import { Td, Tr } from 'src/components/Table/TableStyles'

export interface TableRowProps<T> {
  rowIndex: number
  row: ReactTableRow<T>
  isHighlighted?: boolean
  onRowReorder: (srcRowIndex: number, dstRowIndex: number) => void
}

export function TableRow<T>({ rowIndex, row, isHighlighted, onRowReorder, ...restProps }: TableRowProps<T>) {
  const [{ canDrop, isDragOver }, dropRef] = useDrop({
    accept: 'row',
    drop: (draggedRow: ReactTableRow<T>) => onRowReorder(draggedRow.index, row.index),
    canDrop: () => true,
    collect: (monitor) => ({
      isDragOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  })

  const [{ isDragging }, dragRef, previewRef] = useDrag({
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    item: () => row,
    type: 'row',
  })

  const attachRef = useCallback(
    (element: ConnectableElement) => {
      dragRef(element)
      dropRef(element)
      previewRef(element)
    },
    [dragRef, dropRef, previewRef],
  )

  return (
    <Tr
      ref={attachRef}
      $isDragging={isDragging}
      $canDrop={canDrop}
      $isDragOver={isDragOver}
      $isEven={rowIndex % 2 === 0}
      {...restProps}
    >
      {row.getVisibleCells().map((cell) => {
        const fullWidth = cell.column.columnDef?.meta?.fullWidth
        return (
          <Td
            key={cell.id}
            $isHighlighted={isHighlighted}
            $left={cell.column.getStart()}
            $fullWidth={fullWidth}
            $width={cell.column.getSize()}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </Td>
        )
      })}
    </Tr>
  )
}
