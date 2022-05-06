import React, { memo, useMemo } from 'react'
import { areEqual, ListChildComponentProps } from 'react-window'
import { useRecoilValue } from 'recoil'

import { COLUMN_WIDTHS } from 'src/components/Results/ResultsTableStyle'
import { analysisResultsAtom } from 'src/state/results.state'
import { ResultsTableRowError } from './ResultsTableRowError'
import { ResultsTableRowPending } from './ResultsTableRowPending'
import { ResultsTableRowResult } from './ResultsTableRowResult'

export interface TableRowDatum {
  seqName: string
  viewedGene: string
  columnWidthsPx: Record<keyof typeof COLUMN_WIDTHS, string>
  dynamicColumnWidthPx: string
  cladeNodeAttrKeys: string[]
}

export interface RowProps extends ListChildComponentProps {
  data: TableRowDatum[]
}

export const ResultsTableRow = memo(ResultsTableRowUnmemoed, areEqual)

function ResultsTableRowUnmemoed({ index, data, ...restProps }: RowProps) {
  const { seqName, viewedGene, columnWidthsPx, dynamicColumnWidthPx, cladeNodeAttrKeys } = useMemo(
    () => data[index],
    [data, index],
  )

  const { result, error } = useRecoilValue(analysisResultsAtom(seqName))

  if (error) {
    return <ResultsTableRowError {...restProps} seqName={seqName} columnWidthsPx={columnWidthsPx} />
  }

  if (result) {
    return (
      <ResultsTableRowResult
        {...restProps}
        seqName={seqName}
        columnWidthsPx={columnWidthsPx}
        dynamicColumnWidthPx={dynamicColumnWidthPx}
        cladeNodeAttrKeys={cladeNodeAttrKeys}
        viewedGene={viewedGene}
      />
    )
  }

  return <ResultsTableRowPending seqName={seqName} columnWidthsPx={columnWidthsPx} />
}
