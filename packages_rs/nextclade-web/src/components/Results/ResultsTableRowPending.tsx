import React, { useMemo } from 'react'
import { useRecoilValue } from 'recoil'

import { ColumnName } from 'src/components/Results/ColumnName'
import {
  COLUMN_WIDTHS,
  TableCell,
  TableCellName,
  TableCellText,
  TableRowPending,
} from 'src/components/Results/ResultsTableStyle'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { analysisResultAtom } from 'src/state/results.state'

export interface ResultsTableRowPendingProps {
  seqName: string
  columnWidthsPx: Record<keyof typeof COLUMN_WIDTHS, string>
}

export function ResultsTableRowPending({ seqName, columnWidthsPx, ...restProps }: ResultsTableRowPendingProps) {
  const { t } = useTranslationSafe()
  const text = useMemo(() => t('Analyzing...'), [t])
  const { index } = useRecoilValue(analysisResultAtom(seqName))

  return (
    <TableRowPending {...restProps}>
      <TableCell basis={columnWidthsPx.id} grow={0} shrink={0}>
        <TableCellText>{index}</TableCellText>
      </TableCell>

      <TableCellName basis={columnWidthsPx.seqName} shrink={0}>
        <ColumnName seqName={seqName} />
      </TableCellName>

      <TableCell basis={columnWidthsPx.sequenceView} grow={1} shrink={0}>
        <TableCellText>{text}</TableCellText>
      </TableCell>
    </TableRowPending>
  )
}
