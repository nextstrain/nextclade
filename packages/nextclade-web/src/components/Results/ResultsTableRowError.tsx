import React from 'react'
import { useAtomValue } from 'jotai'

import { ColumnName } from 'src/components/Results/ColumnName'
import {
  COLUMN_WIDTHS,
  TableCell,
  TableCellName,
  TableCellText,
  TableRowError,
} from 'src/components/Results/ResultsTableStyle'
import { analysisResultAtom } from 'src/state/results.state'

export interface ResultsTableRowErrorProps {
  index: number
  columnWidthsPx: Record<keyof typeof COLUMN_WIDTHS, string>
}

export function ResultsTableRowError({ index, columnWidthsPx, ...restProps }: ResultsTableRowErrorProps) {
  const { seqName, error } = useAtomValue(analysisResultAtom(index))

  return (
    <TableRowError {...restProps}>
      <TableCell basis={columnWidthsPx.id} grow={0} shrink={0}>
        <TableCellText>{index}</TableCellText>
      </TableCell>

      <TableCellName basis={columnWidthsPx.seqName} shrink={0}>
        <ColumnName index={index} seqName={seqName} />
      </TableCellName>

      <TableCell basis={columnWidthsPx.sequenceView} grow={1} shrink={0}>
        <TableCellText>{error}</TableCellText>
      </TableCell>
    </TableRowError>
  )
}
