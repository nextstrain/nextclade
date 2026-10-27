import React, { memo, useMemo } from 'react'
import { areEqual, ListChildComponentProps } from 'react-window'
import { useAtomValue } from 'jotai'

import type { CladeNodeAttrDesc } from 'auspice'
import type { AaMotifsDesc, PhenotypeAttrDesc } from 'src/types'
import { COLUMN_WIDTHS } from 'src/components/Results/ResultsTableStyle'
import { analysisResultAtom } from 'src/state/results.state'
import type { CladeColorScale } from 'src/components/Results/cladeColor'
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
  /** Tree colors of the clade and of the clade-like attributes, by attribute */
  cladeColorScales: ReadonlyMap<string, CladeColorScale>
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
    cladeColorScales,
    phenotypeAttrDescs,
    aaMotifsDescs,
  } = useMemo(() => data[index], [data, index])

  const { result, error } = useAtomValue(analysisResultAtom(seqIndex))

  if (error) {
    return <ResultsTableRowError {...restProps} rowIndex={index} seqIndex={seqIndex} columnWidthsPx={columnWidthsPx} />
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
        cladeColorScales={cladeColorScales}
        phenotypeAttrDescs={phenotypeAttrDescs}
        aaMotifsDescs={aaMotifsDescs}
        viewedGene={viewedGene}
      />
    )
  }

  return <ResultsTableRowPending rowIndex={index} seqIndex={seqIndex} columnWidthsPx={columnWidthsPx} />
}
