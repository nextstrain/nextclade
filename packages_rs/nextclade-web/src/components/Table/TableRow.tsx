import { flexRender, Row as ReactTableRow } from '@tanstack/react-table'
import React from 'react'
import { Td, Tr } from 'src/components/Table/TableStyles'

export interface TableRowProps<T> {
  row: ReactTableRow<T>
  isHighlighted: boolean
  onClick?: () => void
}

export function TableRow<T>({ row, isHighlighted, onClick }: TableRowProps<T>) {
  return (
    <Tr onClick={onClick} $isHighlighted={isHighlighted}>
      {row.getVisibleCells().map((cell) => {
        return (
          <Td key={cell.id} $isHighlighted={isHighlighted}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </Td>
        )
      })}
    </Tr>
  )
}
