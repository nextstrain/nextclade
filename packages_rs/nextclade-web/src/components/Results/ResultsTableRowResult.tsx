import isEqual from 'react-fast-compare'
import { mix } from 'polished'
import React, { memo, ReactNode, Suspense, useMemo } from 'react'
import { useRecoilValue } from 'recoil'

import { QcStatus } from 'src/algorithms/types'
import { ColumnClade } from 'src/components/Results/ColumnClade'
import { ColumnCustomNodeAttr } from 'src/components/Results/ColumnCustomNodeAttr'
import { ColumnFrameShifts } from 'src/components/Results/ColumnFrameShifts'
import { ColumnGaps } from 'src/components/Results/ColumnGaps'
import { ColumnInsertions } from 'src/components/Results/ColumnInsertions'
import { ColumnMissing } from 'src/components/Results/ColumnMissing'
import { ColumnMutations } from 'src/components/Results/ColumnMutations'
import { ColumnName } from 'src/components/Results/ColumnName'
import { ColumnNonACGTNs } from 'src/components/Results/ColumnNonACGTNs'
import { ColumnQCStatus } from 'src/components/Results/ColumnQCStatus'
import { ColumnStopCodons } from 'src/components/Results/ColumnStopCodons'
import {
  COLUMN_WIDTHS,
  TableCell,
  TableCellAlignedLeft,
  TableCellName,
  TableCellText,
  TableRow,
} from 'src/components/Results/ResultsTableStyle'
import { PeptideView } from 'src/components/SequenceView/PeptideView'
import { SequenceView } from 'src/components/SequenceView/SequenceView'
import { GENE_OPTION_NUC_SEQUENCE } from 'src/constants'
import { analysisResultAtom } from 'src/state/results.state'

export interface ResultsTableRowResultProps {
  seqName: string
  viewedGene: string
  cladeNodeAttrKeys: string[]
  columnWidthsPx: Record<keyof typeof COLUMN_WIDTHS, string>
  dynamicColumnWidthPx: string
}

export function getQcRowColor(qcStatus: QcStatus) {
  if (qcStatus === QcStatus.mediocre) {
    return '#ffeeaa'
  }
  if (qcStatus === QcStatus.bad) {
    return '#eeaaaa'
  }
  return 'transparent'
}

export function TableRowColored({
  index,
  overallStatus,
  children,
  ...restProps
}: {
  index: number
  overallStatus: QcStatus
  children?: ReactNode
}) {
  const backgroundColor = useMemo(() => {
    const even = index % 2 === 0
    const baseRowColor = even ? '#ededed' : '#fcfcfc'
    const qcRowColor = getQcRowColor(overallStatus)
    return mix(0.5, baseRowColor, qcRowColor)
  }, [index, overallStatus])
  return (
    <TableRow {...restProps} backgroundColor={backgroundColor}>
      {children}
    </TableRow>
  )
}

export const ResultsTableRowResult = memo(ResultsTableRowResultUnmemoed, isEqual)

export function ResultsTableRowResultUnmemoed({
  seqName,
  viewedGene,
  cladeNodeAttrKeys,
  columnWidthsPx,
  dynamicColumnWidthPx,
  ...restProps
}: ResultsTableRowResultProps) {
  const { index, result } = useRecoilValue(analysisResultAtom(seqName))

  const sequenceView = useMemo(() => {
    if (!result) {
      return null
    }

    const { analysisResult } = result
    const { warnings } = analysisResult

    return (
      <Suspense fallback={null}>
        {viewedGene === GENE_OPTION_NUC_SEQUENCE ? (
          <SequenceView key={seqName} sequence={analysisResult} />
        ) : (
          <PeptideView key={seqName} sequence={analysisResult} viewedGene={viewedGene} warnings={warnings} />
        )}
      </Suspense>
    )
  }, [result, seqName, viewedGene])

  const dynamicColumns = useMemo(() => {
    if (!result) {
      return null
    }

    const { analysisResult } = result

    return cladeNodeAttrKeys.map((attrKey) => (
      <TableCellAlignedLeft key={attrKey} basis={dynamicColumnWidthPx} grow={0} shrink={0}>
        <ColumnCustomNodeAttr sequence={analysisResult} attrKey={attrKey} />
      </TableCellAlignedLeft>
    ))
  }, [cladeNodeAttrKeys, dynamicColumnWidthPx, result])

  if (!result) {
    return null
  }

  const { analysisResult } = result
  const { qc } = analysisResult

  return (
    <TableRowColored {...restProps} index={index} overallStatus={qc.overallStatus}>
      <TableCell basis={columnWidthsPx.id} grow={0} shrink={0}>
        <TableCellText>{index}</TableCellText>
      </TableCell>

      <TableCellName basis={columnWidthsPx.seqName} shrink={0}>
        <ColumnName seqName={seqName} />
      </TableCellName>

      <TableCell basis={columnWidthsPx.qc} grow={0} shrink={0}>
        <ColumnQCStatus analysisResult={analysisResult} />
      </TableCell>

      <TableCellAlignedLeft basis={columnWidthsPx.clade} grow={0} shrink={0}>
        <ColumnClade analysisResult={analysisResult} />
      </TableCellAlignedLeft>

      {dynamicColumns}

      <TableCell basis={columnWidthsPx.mut} grow={0} shrink={0}>
        <ColumnMutations analysisResult={analysisResult} />
      </TableCell>

      <TableCell basis={columnWidthsPx.nonACGTN} grow={0} shrink={0}>
        <ColumnNonACGTNs analysisResult={analysisResult} />
      </TableCell>

      <TableCell basis={columnWidthsPx.ns} grow={0} shrink={0}>
        <ColumnMissing analysisResult={analysisResult} />
      </TableCell>

      <TableCell basis={columnWidthsPx.gaps} grow={0} shrink={0}>
        <ColumnGaps analysisResult={analysisResult} />
      </TableCell>

      <TableCell basis={columnWidthsPx.insertions} grow={0} shrink={0}>
        <ColumnInsertions analysisResult={analysisResult} />
      </TableCell>

      <TableCell basis={columnWidthsPx.frameShifts} grow={0} shrink={0}>
        <ColumnFrameShifts analysisResult={analysisResult} />
      </TableCell>

      <TableCell basis={columnWidthsPx.stopCodons} grow={0} shrink={0}>
        <ColumnStopCodons analysisResult={analysisResult} />
      </TableCell>

      <TableCell basis={columnWidthsPx.sequenceView} grow={1} shrink={0}>
        {sequenceView}
      </TableCell>
    </TableRowColored>
  )
}
