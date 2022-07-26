import React, { memo, useMemo } from 'react'
import { areEqual, ListChildComponentProps } from 'react-window'
import { useRecoilValue } from 'recoil'

import { COLUMN_WIDTHS } from 'src/components/Results/ResultsTableStyle'
import { analysisResultAtom } from 'src/state/results.state'
import { ResultsTableRowError } from './ResultsTableRowError'
import { ResultsTableRowPending } from './ResultsTableRowPending'
import { ResultsTableRowResult } from './ResultsTableRowResult'

export interface TableRowDatum {
  seqIndex: number
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
  const { seqIndex, viewedGene, columnWidthsPx, dynamicColumnWidthPx, cladeNodeAttrKeys } = useMemo(
    () => data[index],
    [data, index],
  )

  const { result, error } = useRecoilValue(analysisResultAtom(seqIndex))

  if (error) {
    return <ResultsTableRowError {...restProps} index={seqIndex} columnWidthsPx={columnWidthsPx} />
  }

  if (result) {
    return (
      <ResultsTableRowResult
        {...restProps}
        index={seqIndex}
        columnWidthsPx={columnWidthsPx}
        dynamicColumnWidthPx={dynamicColumnWidthPx}
        cladeNodeAttrKeys={cladeNodeAttrKeys}
        viewedGene={viewedGene}
      />
    )
  }

  return <ResultsTableRowPending index={seqIndex} columnWidthsPx={columnWidthsPx} />
}
