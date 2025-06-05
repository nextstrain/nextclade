import { round, sortBy } from 'lodash'
import React, { useCallback, useMemo, useState } from 'react'
import { useRecoilValue } from 'recoil'
import { TableSlim } from 'src/components/Common/TableSlim'
import { Tooltip } from 'src/components/Results/Tooltip'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { viewedDatasetNameAtom } from 'src/state/dataset.state'
import { cdsesAtom } from 'src/state/results.state'

import type { AnalysisResult } from 'src/types'
import { getSafeId } from 'src/helpers/getSafeId'
import styled from 'styled-components'

const MAX_ROWS = 10

export interface ColumnCoverageProps {
  analysisResult: AnalysisResult
}

export function ColumnCoverage({ analysisResult }: ColumnCoverageProps) {
  const { t } = useTranslationSafe()
  const [showTooltip, setShowTooltip] = useState(false)
  const onMouseEnter = useCallback(() => setShowTooltip(true), [])
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])

  const { index, seqName, coverage, cdsCoverage } = analysisResult

  const id = getSafeId('col-coverage', { index, seqName })

  const coveragePercentage = useMemo(() => formatCoveragePercentage(coverage), [coverage])

  const { rows, isTruncated } = useMemo(() => {
    const cdsCoverageSorted = sortBy(Object.entries(cdsCoverage), ([_, coverage]) => coverage)
    const { head, tail } = truncateMiddle(cdsCoverageSorted, MAX_ROWS * 2)
    let rows = head.map(([cds, coverage]) => <CdsCoverageRow key={cds} cds={cds} coverage={coverage} />)
    if (tail) {
      const tailRows = tail.map(([cds, coverage]) => <CdsCoverageRow key={cds} cds={cds} coverage={coverage} />)
      rows = [...rows, <Spacer key="spacer" />, ...tailRows]
    }
    return { rows, isTruncated: !!tail }
  }, [cdsCoverage])

  return (
    <div id={id} className="w-100" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {coveragePercentage}
      <Tooltip isOpen={showTooltip} target={id}>
        <div className="w-100">
          <h6>{t('Nucleotide coverage: {{ value }}', { value: coveragePercentage })}</h6>
        </div>

        <div className="mt-3 w-100">
          <h6>{t('CDS coverage')}</h6>
          {isTruncated && (
            <p className="small">
              {t('Showing only the {{ num }} CDS with lowest and {{ num }} CDS with highest coverage', {
                num: MAX_ROWS,
              })}
            </p>
          )}
          <TableSlim striped className="mb-1">
            <thead>
              <tr>
                <th className="text-center">{t('CDS')}</th>
                <th className="text-center">{t('Coverage')}</th>
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </TableSlim>
        </div>
      </Tooltip>
    </div>
  )
}

function CdsCoverageRow({ cds, coverage }: { cds: string; coverage: number }) {
  const datasetName = useRecoilValue(viewedDatasetNameAtom)
  const cdses = useRecoilValue(cdsesAtom({ datasetName })) ?? []
  const color = cdses.find((c) => c.name === cds)?.color ?? '#aaa'
  return (
    <tr key={cds}>
      <td>
        <CdsText $background={color}>{cds}</CdsText>
      </td>
      <td className="text-monospace text-right">{formatCoveragePercentage(coverage)}</td>
    </tr>
  )
}

function Spacer() {
  return (
    <tr>
      <td colSpan={2} className="text-center">
        {'...'}
      </td>
    </tr>
  )
}

const CdsText = styled.span<{ $background?: string; $color?: string }>`
  padding: 1px 2px;
  background-color: ${(props) => props.$background};
  color: ${(props) => props.$color ?? props.theme.gray100};
  font-weight: 700;
  border-radius: 3px;
`

function formatCoveragePercentage(coverage: number) {
  return `${round(coverage * 100, 1).toFixed(1)}%`
}

function truncateMiddle<T>(arr: T[], n: number) {
  if (n < 3 || arr.length <= n) return { head: arr, tail: undefined }
  const half = Math.floor((n - 2) / 2)
  return { head: arr.slice(0, half), tail: arr.slice(arr.length - (n - half - 1)) }
}
