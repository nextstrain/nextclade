import React, { SVGProps, useCallback, useState } from 'react'
import { useRecoilValue } from 'recoil'

import { BASE_MIN_WIDTH_PX } from 'src/constants'
import { viewedDatasetNameAtom } from 'src/state/dataset.state'
import type { FrameShift } from 'src/types'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { Tooltip } from 'src/components/Results/Tooltip'
import { TableRowSpacer, TableSlim } from 'src/components/Common/TableSlim'
import { formatRange, formatRangeMaybeEmpty } from 'src/helpers/formatRange'
import { getSafeId } from 'src/helpers/getSafeId'
import { cdsAtom } from 'src/state/results.state'
import { sumBy } from 'lodash'
import { rangeLen } from 'src/types'

const frameShiftColor = '#eb0d2a'
const frameShiftBorderColor = '#ffff00'

export interface PeptideMarkerFrameShiftProps extends SVGProps<SVGRectElement> {
  index: number
  seqName: string
  frameShift: FrameShift
  pixelsPerAa: number
}

function PeptideMarkerFrameShiftUnmemoed({
  index,
  seqName,
  frameShift,
  pixelsPerAa,
  ...rest
}: PeptideMarkerFrameShiftProps) {
  const { t } = useTranslationSafe()
  const [showTooltip, setShowTooltip] = useState(false)
  const onMouseEnter = useCallback(() => setShowTooltip(true), [])
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])

  const { cdsName, nucAbs, codon, gapsLeading, gapsTrailing } = frameShift
  const id = getSafeId('frame-shift-aa-marker', { index, seqName, ...frameShift })

  const datasetName = useRecoilValue(viewedDatasetNameAtom)
  const cds = useRecoilValue(cdsAtom({ datasetName, cdsName }))
  if (!cds) {
    return null
  }

  const nucLength = sumBy(nucAbs, (nucAbs) => nucAbs.end - nucAbs.begin)
  const codonLength = rangeLen(codon)

  let width = codonLength * pixelsPerAa
  width = Math.max(width, BASE_MIN_WIDTH_PX)
  const halfAa = Math.max(pixelsPerAa, BASE_MIN_WIDTH_PX) / 2 // Anchor on the center of the first AA
  const x = codon.begin * pixelsPerAa - halfAa

  const codonRangeStr = formatRange(codon)
  const nucRangeStr = nucAbs.map((nucAbs) => formatRange(nucAbs)).join(', ')

  return (
    <g id={id}>
      <rect
        fill={frameShiftBorderColor}
        x={x - 1}
        y={1.75}
        width={width + 2}
        stroke={frameShiftBorderColor}
        strokeWidth={0.5}
        height={7}
      />
      <rect
        id={id}
        fill={frameShiftColor}
        x={x}
        y={2.5}
        width={width}
        height="5"
        {...rest}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <Tooltip target={id} isOpen={showTooltip} fullWidth>
          <h5>{t('Frame shift')}</h5>

          <TableSlim borderless className="mb-1">
            <thead />
            <tbody>
              <tr>
                <td>{t('Nucleotide range')}</td>
                <td>{nucRangeStr}</td>
              </tr>

              <tr>
                <td>{t('Nucleotide length')}</td>
                <td>{nucLength}</td>
              </tr>

              <tr>
                <td>{t('CDS')}</td>
                <td>{cdsName}</td>
              </tr>

              <tr>
                <td>{t('Codon range')}</td>
                <td>{codonRangeStr}</td>
              </tr>

              <tr>
                <td>{t('Codon length')}</td>
                <td>{codonLength}</td>
              </tr>

              <TableRowSpacer />

              <tr>
                <td>{t('Leading deleted codon range')}</td>
                <td>{formatRangeMaybeEmpty(gapsLeading)}</td>
              </tr>

              <tr>
                <td>{t('Trailing deleted codon range')}</td>
                <td>{formatRangeMaybeEmpty(gapsTrailing)}</td>
              </tr>
            </tbody>
          </TableSlim>
        </Tooltip>
      </rect>
    </g>
  )
}

export const PeptideMarkerFrameShift = React.memo(PeptideMarkerFrameShiftUnmemoed)
