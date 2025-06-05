import React, { memo, useMemo } from 'react'
import { areEqual, ListChildComponentProps } from 'react-window'
import { useRecoilValue } from 'recoil'
import {
  COLUMN_WIDTHS,
  TableCell,
  TableCellName,
  TableCellRowIndex,
  TableCellText,
} from 'src/components/Results/ResultsTableStyle'
import { ColumnName } from 'src/components/Results/ColumnName'
import { TableRowColored } from 'src/components/Results/ResultsTableRowResult'
import { analysisResultAtom } from 'src/state/results.state'

export interface ResultsTableUnknownDatasetRowDatum {
  seqIndex: number
  columnWidthsPx: Record<keyof typeof COLUMN_WIDTHS, string>
}

export interface RowProps extends ListChildComponentProps {
  data: ResultsTableUnknownDatasetRowDatum[]
}

export const ResultsTableUnknownDatasetRow = memo(ResultsTableUnknownDatasetRowUnmemoed, areEqual)

function ResultsTableUnknownDatasetRowUnmemoed({ index, data, ...restProps }: RowProps) {
  const { seqIndex, columnWidthsPx } = useMemo(() => data[index], [data, index])
  return (
    <ResultsTableUnknownDatasetRowResult
      rowIndex={index}
      seqIndex={seqIndex}
      columnWidthsPx={columnWidthsPx}
      {...restProps}
    />
  )
}

export interface ResultsTableUnknownDatasetRowResultProps {
  rowIndex: number
  seqIndex: number
  columnWidthsPx: Record<keyof typeof COLUMN_WIDTHS, string>
}

export function ResultsTableUnknownDatasetRowResult({
  rowIndex,
  seqIndex,
  columnWidthsPx,
  ...restProps
}: ResultsTableUnknownDatasetRowResultProps) {
  const { seqName } = useRecoilValue(analysisResultAtom(seqIndex))

  return (
    <TableRowColored {...restProps} index={rowIndex} overallStatus={'good'} muted={false}>
      <TableCellRowIndex basis={columnWidthsPx.rowIndex} grow={0} shrink={0}>
        <TableCellText>{rowIndex}</TableCellText>
      </TableCellRowIndex>

      <TableCell basis={columnWidthsPx.id} grow={0} shrink={0}>
        <TableCellText>{seqIndex}</TableCellText>
      </TableCell>

      <TableCellName basis={columnWidthsPx.seqName} shrink={0}>
        <ColumnName index={seqIndex} seqName={seqName} />
      </TableCellName>
    </TableRowColored>
  )
}
