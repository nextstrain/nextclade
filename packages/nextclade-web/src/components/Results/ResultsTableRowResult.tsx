import { isNil } from 'lodash'
import { mix } from 'polished'
import React, { ReactNode, Suspense, useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import type { CladeNodeAttrDesc } from 'auspice'
import { AaMotifsDesc, getNucMutations, PhenotypeAttrDesc, QcStatus } from 'src/types'
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
  TableCellRowIndex,
  TableCellText,
  TableRow,
} from 'src/components/Results/ResultsTableStyle'
import { PeptideView } from 'src/components/SequenceView/PeptideView'
import { SequenceView } from 'src/components/SequenceView/SequenceView'
import { CDS_OPTION_NUC_SEQUENCE } from 'src/constants'
import { analysisResultAtom, currentRefNodeNameAtom } from 'src/state/results.state'
import { ColumnCoverage } from 'src/components/Results/ColumnCoverage'
import { ColumnAaMotifs } from 'src/components/Results/ColumnAaMotifs'

export interface ResultsTableRowResultProps {
  rowIndex: number
  seqIndex: number
  viewedGene: string
  cladeNodeAttrDescs: CladeNodeAttrDesc[]
  phenotypeAttrDescs: PhenotypeAttrDesc[]
  aaMotifsDescs: AaMotifsDesc[]
  columnWidthsPx: Record<keyof typeof COLUMN_WIDTHS, string>
  dynamicCladeColumnWidthPx: string
  dynamicPhenotypeColumnWidthPx: string
  dynamicAaMotifsColumnWidthPx: string
}

export function getQcRowColor(qcStatus: QcStatus) {
  if (qcStatus === 'mediocre') {
    return '#ffeeaa'
  }
  if (qcStatus === 'bad') {
    return '#eeaaaa'
  }
  return 'transparent'
}

export function TableRowColored({
  index,
  overallStatus,
  muted,
  children,
  ...restProps
}: {
  index: number
  overallStatus: QcStatus
  muted?: boolean
  children?: ReactNode
}) {
  const { backgroundColor, opacity } = useMemo(() => {
    const even = index % 2 === 0
    const baseRowColor = even ? '#ededed' : '#fcfcfc'
    const qcRowColor = getQcRowColor(overallStatus)
    const backgroundColor = mix(0.5, baseRowColor, qcRowColor)
    const opacity = muted ? 0.5 : undefined
    return { backgroundColor, opacity }
  }, [index, muted, overallStatus])
  return (
    <TableRow {...restProps} backgroundColor={backgroundColor} opacity={opacity}>
      {children}
    </TableRow>
  )
}

export function ResultsTableRowResult({
  rowIndex,
  seqIndex,
  viewedGene,
  cladeNodeAttrDescs,
  phenotypeAttrDescs,
  aaMotifsDescs,
  columnWidthsPx,
  dynamicCladeColumnWidthPx,
  dynamicPhenotypeColumnWidthPx,
  dynamicAaMotifsColumnWidthPx,
  ...restProps
}: ResultsTableRowResultProps) {
  const { seqName, result } = useRecoilValue(analysisResultAtom(seqIndex))
  const refNodeName = useRecoilValue(currentRefNodeNameAtom)

  const data = useMemo(() => {
    if (!result) {
      return null
    }

    const { analysisResult } = result
    const { qc, warnings } = analysisResult

    return { analysisResult, qc, warnings }
  }, [result])

  if (!data) {
    return null
  }

  const { analysisResult, qc, warnings } = data

  const nucMuts = getNucMutations(analysisResult, refNodeName)
  const muted = isNil(nucMuts)

  return (
    <TableRowColored {...restProps} index={rowIndex} overallStatus={qc.overallStatus} muted={muted}>
      <TableCellRowIndex basis={columnWidthsPx.rowIndex} grow={0} shrink={0}>
        <TableCellText>{rowIndex}</TableCellText>
      </TableCellRowIndex>

      <TableCell basis={columnWidthsPx.id} grow={0} shrink={0}>
        <TableCellText>{seqIndex}</TableCellText>
      </TableCell>

      <TableCellName basis={columnWidthsPx.seqName} shrink={0}>
        <ColumnName index={seqIndex} seqName={seqName} />
      </TableCellName>

      <TableCell basis={columnWidthsPx.qc} grow={0} shrink={0}>
        <ColumnQCStatus analysisResult={analysisResult} />
      </TableCell>

      <TableCellAlignedLeft basis={columnWidthsPx.clade} grow={0} shrink={0}>
        <ColumnClade analysisResult={analysisResult} />
      </TableCellAlignedLeft>

      {cladeNodeAttrDescs
        .filter((attr) => !attr.hideInWeb)
        .map(({ name }) => (
          <TableCellAlignedLeft key={name} basis={dynamicCladeColumnWidthPx} grow={0} shrink={0}>
            <ColumnCustomNodeAttr sequence={analysisResult} attrKey={name} />
          </TableCellAlignedLeft>
        ))}

      {phenotypeAttrDescs.map(({ name }) => (
        <TableCellAlignedLeft key={name} basis={dynamicPhenotypeColumnWidthPx} grow={0} shrink={0}>
          <ColumnCustomNodeAttr sequence={analysisResult} attrKey={name} />
        </TableCellAlignedLeft>
      ))}

      {aaMotifsDescs.map((desc) => (
        <TableCell key={desc.name} basis={dynamicAaMotifsColumnWidthPx} grow={0} shrink={0}>
          <ColumnAaMotifs analysisResult={analysisResult} motifDesc={desc} />
        </TableCell>
      ))}

      <TableCell basis={columnWidthsPx.mut} grow={0} shrink={0}>
        <ColumnMutations analysisResult={analysisResult} />
      </TableCell>

      <TableCell basis={columnWidthsPx.nonACGTN} grow={0} shrink={0}>
        <ColumnNonACGTNs analysisResult={analysisResult} />
      </TableCell>

      <TableCell basis={columnWidthsPx.ns} grow={0} shrink={0}>
        <ColumnMissing analysisResult={analysisResult} />
      </TableCell>

      <TableCell basis={columnWidthsPx.coverage} grow={0} shrink={0}>
        <ColumnCoverage analysisResult={analysisResult} />
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
        <Suspense fallback={null}>
          {viewedGene === CDS_OPTION_NUC_SEQUENCE ? (
            <SequenceView key={seqName} sequence={analysisResult} />
          ) : (
            <PeptideView key={seqName} sequence={analysisResult} viewedGene={viewedGene} warnings={warnings} />
          )}
        </Suspense>
      </TableCell>
    </TableRowColored>
  )
}
