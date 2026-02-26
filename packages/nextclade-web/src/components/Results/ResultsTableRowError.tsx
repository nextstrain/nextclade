import React from 'react'
import { useAtomValue } from 'jotai'

import { ColumnName } from 'src/components/Results/ColumnName'
import {
  COLUMN_WIDTHS,
  TableCell,
  TableCellName,
  TableCellRowIndex,
  TableCellText,
  TableRowError,
} from 'src/components/Results/ResultsTableStyle'
import { analysisResultAtom } from 'src/state/results.state'

export interface ResultsTableRowErrorProps {
  rowIndex: number
  seqIndex: number
  columnWidthsPx: Record<keyof typeof COLUMN_WIDTHS, string>
}

export function ResultsTableRowError({ rowIndex, seqIndex, columnWidthsPx, ...restProps }: ResultsTableRowErrorProps) {
  const { seqName, error } = useAtomValue(analysisResultAtom(seqIndex))

  return (
    <TableRowError {...restProps}>
      <TableCellRowIndex basis={columnWidthsPx.rowIndex} grow={0} shrink={0}>
        <TableCellText>{rowIndex}</TableCellText>
      </TableCellRowIndex>

      <TableCell basis={columnWidthsPx.id} grow={0} shrink={0}>
        <TableCellText>{seqIndex}</TableCellText>
      </TableCell>

      <TableCellName basis={columnWidthsPx.seqName} shrink={0}>
        <ColumnName index={seqIndex} seqName={seqName} />
      </TableCellName>

      <TableCell basis={columnWidthsPx.sequenceView} grow={1} shrink={0}>
        <TableCellText>{error}</TableCellText>
      </TableCell>
    </TableRowError>
  )
}
