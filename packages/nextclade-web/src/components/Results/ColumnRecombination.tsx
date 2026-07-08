import React, { ReactElement, useCallback, useState } from 'react'
import { useRecoilValue } from 'recoil'
import { viewedDatasetNameAtom } from 'src/state/dataset.state'
import type { AnalysisResult } from 'src/types'
import { TableSlim } from 'src/components/Common/TableSlim'
import { Tooltip } from 'src/components/Results/Tooltip'
import { getSafeId } from 'src/helpers/getSafeId'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { genomeSizeAtom } from 'src/state/results.state'
import { formatRange } from 'src/helpers/formatRange'
import { Li, Ul } from 'src/components/Common/List'

const RECOMBINATION_TOOLTIP_MAX_REGIONS = 20 as const

export interface ColumnRecombinationProps {
  analysisResult: AnalysisResult
}

function formatPercent(value: number, total: number): string {
  if (total === 0) {
    return '0%'
  }
  return `${((value / total) * 100).toFixed(1)}%`
}

export function ColumnRecombination({ analysisResult }: ColumnRecombinationProps) {
  const { t } = useTranslationSafe()
  const [showTooltip, setShowTooltip] = useState(false)
  const onMouseEnter = useCallback(() => setShowTooltip(true), [])
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])

  const { index, seqName, recombination } = analysisResult
  const id = getSafeId('col-recombination', { index, seqName })

  const datasetName = useRecoilValue(viewedDatasetNameAtom)
  const genomeSize = useRecoilValue(genomeSizeAtom({ datasetName })) ?? 0

  if (!recombination) {
    return <div className="w-100">{'--'}</div>
  }

  const { totalLength, totalRegions, longestRegion, regions } = recombination

  // Build at most `RECOMBINATION_TOOLTIP_MAX_REGIONS` list items even when there are more regions:
  // slice before mapping so the elements past the cap are never constructed, then append one overflow
  // item summarizing the remainder.
  const regionItems: ReactElement[] = regions.slice(0, RECOMBINATION_TOOLTIP_MAX_REGIONS).map((region) => {
    const rangeStr = formatRange(region.range)
    const confidenceStr =
      region.confidence === undefined ? '' : `, ${t('{{p}}% conf.', { p: (region.confidence * 100).toFixed(1) })}`
    return (
      <Li key={rangeStr}>
        {rangeStr} ({t('{{n}} nt', { n: region.length })}
        {confidenceStr})
      </Li>
    )
  })

  if (regions.length > RECOMBINATION_TOOLTIP_MAX_REGIONS) {
    const remaining = regions.length - RECOMBINATION_TOOLTIP_MAX_REGIONS
    regionItems.push(<Li key="__overflow__">{t('...and {{n}} more', { n: remaining })}</Li>)
  }

  return (
    <div id={id} className="w-100" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {totalLength}
      <Tooltip isOpen={showTooltip} target={id} wide fullWidth>
        <TableSlim borderless className="mb-1">
          <thead />
          <tbody>
            <tr>
              <td>{t('Recombinant regions')}</td>
              <td>{totalRegions}</td>
            </tr>
            <tr>
              <td>{t('Total length')}</td>
              <td>
                {t('{{n}} nt', { n: totalLength })} ({formatPercent(totalLength, genomeSize)})
              </td>
            </tr>
            <tr>
              <td>{t('Longest region')}</td>
              <td>
                {formatRange(longestRegion.range)} ({t('{{n}} nt', { n: longestRegion.length })},{' '}
                {formatPercent(longestRegion.length, genomeSize)})
              </td>
            </tr>
          </tbody>
        </TableSlim>

        <h6 className="mb-0">{t('Regions ({{ n }})', { n: totalRegions })}</h6>
        <Ul>{regionItems}</Ul>
      </Tooltip>
    </div>
  )
}
