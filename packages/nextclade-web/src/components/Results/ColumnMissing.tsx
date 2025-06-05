import React, { useCallback, useState } from 'react'
import { useRecoilValue } from 'recoil'
import { viewedDatasetNameAtom } from 'src/state/dataset.state'
import type { DeepReadonly } from 'ts-essentials'
import type { AnalysisResult, NucleotideMissing, Range } from 'src/types'
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

  const { index, missing, seqName, totalMissing, alignmentRange } = analysisResult
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
            <AlignmentRangeTable alignmentRange={alignmentRange} />
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

  let missingItems = missing.map(({ range }) => {
    const rangeStr = formatRangeMaybeEmpty(range)
    return <Li key={rangeStr}>{rangeStr}</Li>
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
  alignmentRange: Range
}

export function AlignmentRangeTable({ alignmentRange }: AlignmentRangeTableProps) {
  const { t } = useTranslationSafe()
  const datasetName = useRecoilValue(viewedDatasetNameAtom)
  const genomeSize = useRecoilValue(genomeSizeAtom({ datasetName })) ?? 0

  const totalBegin = alignmentRange.begin
  const totalEnd = genomeSize - alignmentRange.end
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
            <td>{formatRangeMaybeEmpty({ begin: 0, end: alignmentRange.begin })}</td>
            <td>{totalBegin}</td>
          </tr>
          <tr>
            <td>{t("3' end")}</td>
            <td>{formatRangeMaybeEmpty({ begin: alignmentRange.end, end: genomeSize })}</td>
            <td>{totalEnd}</td>
          </tr>
        </tbody>
      </TableSlimWithBorders>
      <small>
        <p className="my-0 py-0">{t('Alignment range: {{range}}', { range: formatRange(alignmentRange) })}</p>
        <p className="my-0 py-0">{t('Genome length: {{length}}', { length: genomeSize })}</p>
      </small>
    </>
  )
}
