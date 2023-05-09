import React, { useCallback, useState } from 'react'
import { useRecoilValue } from 'recoil'
import type { DeepReadonly } from 'ts-essentials'
import type { AnalysisResult, NucleotideMissing } from 'src/types'
import { getSafeId } from 'src/helpers/getSafeId'
import { Tooltip } from 'src/components/Results/Tooltip'
import { Col, Row } from 'reactstrap'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { TableSlimWithBorders } from 'src/components/Common/TableSlim'
import { formatRange, formatRangeMaybeEmpty } from 'src/helpers/formatRange'
import { genomeSizeAtom } from 'src/state/results.state'
import { truncateList } from 'src/components/Results/truncateList'
import { Li, Ul } from 'src/components/Common/List'

const LIST_OF_MISSING_TOOLTIP_MAX_ITEMS = 12 as const

export interface ColumnMissingProps {
  analysisResult: AnalysisResult
}

export function ColumnMissing({ analysisResult }: ColumnMissingProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const onMouseEnter = useCallback(() => setShowTooltip(true), [])
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])

  const { index, missing, seqName, totalMissing, alignmentStart, alignmentEnd } = analysisResult
  const id = getSafeId('col-missing', { index, seqName })

  return (
    <div id={id} className="w-100" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {totalMissing}
      <Tooltip isOpen={showTooltip} target={id} wide>
        <Row noGutters>
          <Col>
            <ListOfMissing missing={missing} totalMissing={totalMissing} />
          </Col>
        </Row>

        <Row noGutters>
          <Col>
            <AlignmentRangeTable alignmentStart={alignmentStart} alignmentEnd={alignmentEnd} />
          </Col>
        </Row>
      </Tooltip>
    </div>
  )
}

export interface ListOfMissingProps {
  missing: DeepReadonly<NucleotideMissing[]>
  totalMissing: number
}

export function ListOfMissing({ missing, totalMissing }: ListOfMissingProps) {
  const { t } = useTranslationSafe()

  let missingItems = missing.map(({ begin, end }) => {
    const range = formatRangeMaybeEmpty(begin, end)
    return <Li key={range}>{range}</Li>
  })

  missingItems = truncateList(missingItems, LIST_OF_MISSING_TOOLTIP_MAX_ITEMS, t('...more'))

  return (
    <>
      <h6 className="mb-0">{t('Missing ({{ n }})', { n: totalMissing })}</h6>
      <p className="my-0">
        <small>{t('Ranges of nucleotide "N"')}</small>
      </p>
      <Ul>{missingItems}</Ul>
    </>
  )
}

export interface AlignmentRangeTableProps {
  alignmentStart: number
  alignmentEnd: number
}

export function AlignmentRangeTable({ alignmentStart, alignmentEnd }: AlignmentRangeTableProps) {
  const { t } = useTranslationSafe()
  const genomeSize = useRecoilValue(genomeSizeAtom)

  const totalBegin = alignmentStart
  const totalEnd = genomeSize - alignmentEnd
  const total = totalBegin + totalEnd

  return (
    <>
      <h6 className="mb-0">{t('Not sequenced ({{ n }})', { n: total })}</h6>
      <small>
        <p>
          {t(
            'Regions outside of alignment on both ends: the nucleotides present in reference sequence, not present in query sequence and which became "-" in the aligned sequence.',
          )}
        </p>
      </small>
      <TableSlimWithBorders className="mb-1">
        <thead>
          <tr>
            <th />
            <th>{t('Range')}</th>
            <th>{t('Length')}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{t("5' end")}</td>
            <td>{formatRangeMaybeEmpty(0, alignmentStart)}</td>
            <td>{totalBegin}</td>
          </tr>
          <tr>
            <td>{t("3' end")}</td>
            <td>{formatRangeMaybeEmpty(alignmentEnd, genomeSize)}</td>
            <td>{totalEnd}</td>
          </tr>
        </tbody>
      </TableSlimWithBorders>
      <small>
        <p className="my-0 py-0">
          {t('Alignment range: {{range}}', { range: formatRange(alignmentStart, alignmentEnd) })}
        </p>
        <p className="my-0 py-0">{t('Genome length: {{length}}', { length: genomeSize })}</p>
      </small>
    </>
  )
}
