import React from 'react'
import { useRecoilValue } from 'recoil'

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
  seqName: string
  columnWidthsPx: Record<keyof typeof COLUMN_WIDTHS, string>
}

export function ResultsTableRowError({ seqName, columnWidthsPx, ...restProps }: ResultsTableRowErrorProps) {
  const { index, error } = useRecoilValue(analysisResultAtom(seqName))

  return (
    <TableRowError {...restProps} even={index % 2 === 0}>
      <TableCell basis={columnWidthsPx.id} grow={0} shrink={0}>
        <TableCellText>{index}</TableCellText>
      </TableCell>

      <TableCellName basis={columnWidthsPx.seqName} shrink={0}>
        <ColumnName seqName={seqName} />
      </TableCellName>

      <TableCell basis={columnWidthsPx.sequenceView} grow={1} shrink={0}>
        <TableCellText>{error}</TableCellText>
      </TableCell>
    </TableRowError>
  )
}
