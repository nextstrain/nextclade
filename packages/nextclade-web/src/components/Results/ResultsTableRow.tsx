import React, { memo, useMemo } from 'react'
import { areEqual, ListChildComponentProps } from 'react-window'
import { useAtomValue } from 'jotai'

import type { CladeNodeAttrDesc } from 'auspice'
import type { AaMotifsDesc, PhenotypeAttrDesc } from 'src/types'
import { COLUMN_WIDTHS } from 'src/components/Results/ResultsTableStyle'
import { analysisResultAtom } from 'src/state/results.state'
import { ResultsTableRowError } from './ResultsTableRowError'
import { ResultsTableRowPending } from './ResultsTableRowPending'
import { ResultsTableRowResult } from './ResultsTableRowResult'

export interface TableRowDatum {
  seqIndex: number
  viewedGene: string
  columnWidthsPx: Record<keyof typeof COLUMN_WIDTHS, string>
  dynamicCladeColumnWidthPx: string
  dynamicPhenotypeColumnWidthPx: string
  dynamicAaMotifsColumnWidthPx: string
  cladeNodeAttrDescs: CladeNodeAttrDesc[]
  phenotypeAttrDescs: PhenotypeAttrDesc[]
  aaMotifsDescs: AaMotifsDesc[]
}

export interface RowProps extends ListChildComponentProps {
  data: TableRowDatum[]
}

export const ResultsTableRow = memo(ResultsTableRowUnmemoed, areEqual)

function ResultsTableRowUnmemoed({ index, data, ...restProps }: RowProps) {
  const {
    seqIndex,
    viewedGene,
    columnWidthsPx,
    dynamicCladeColumnWidthPx,
    dynamicPhenotypeColumnWidthPx,
    dynamicAaMotifsColumnWidthPx,
    cladeNodeAttrDescs,
    phenotypeAttrDescs,
    aaMotifsDescs,
  } = useMemo(() => data[index], [data, index])

  const { result, error } = useAtomValue(analysisResultAtom(seqIndex))

  if (error) {
    return <ResultsTableRowError {...restProps} index={seqIndex} columnWidthsPx={columnWidthsPx} />
  }

  if (result) {
    return (
      <ResultsTableRowResult
        {...restProps}
        rowIndex={index}
        seqIndex={seqIndex}
        columnWidthsPx={columnWidthsPx}
        dynamicCladeColumnWidthPx={dynamicCladeColumnWidthPx}
        dynamicPhenotypeColumnWidthPx={dynamicPhenotypeColumnWidthPx}
        dynamicAaMotifsColumnWidthPx={dynamicAaMotifsColumnWidthPx}
        cladeNodeAttrDescs={cladeNodeAttrDescs}
        phenotypeAttrDescs={phenotypeAttrDescs}
        aaMotifsDescs={aaMotifsDescs}
        viewedGene={viewedGene}
      />
    )
  }

  return <ResultsTableRowPending index={seqIndex} columnWidthsPx={columnWidthsPx} />
}
