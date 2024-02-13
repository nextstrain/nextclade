import React, { SVGProps, useCallback, useState } from 'react'

import { AMINOACID_UNKNOWN, AA_MIN_WIDTH_PX, BASE_MIN_WIDTH_PX } from 'src/constants'

import type { AminoacidRange } from 'src/types'
import { TableSlim } from 'src/components/Common/TableSlim'
import { Tooltip } from 'src/components/Results/Tooltip'
import { getAminoacidColor } from 'src/helpers/getAminoacidColor'
import { formatRange } from 'src/helpers/formatRange'
import { getSafeId } from 'src/helpers/getSafeId'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { rangeLen } from 'src/types'

const unknownAaColor = getAminoacidColor(AMINOACID_UNKNOWN)

export interface PeptideMarkerUnknownProps extends SVGProps<SVGRectElement> {
  index: number
  seqName: string
  range: AminoacidRange
  pixelsPerAa: number
}

export function PeptideMarkerUnknownUnmemoed({
  index,
  seqName,
  range,
  pixelsPerAa,
  ...rest
}: PeptideMarkerUnknownProps) {
  const { t } = useTranslationSafe()
  const [showTooltip, setShowTooltip] = useState(false)
  const onMouseEnter = useCallback(() => setShowTooltip(true), [])
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])

  const id = getSafeId('unknown-marker', { index, seqName, ...range })
  const length = rangeLen(range.range)
  let width = length * pixelsPerAa
  width = Math.max(width, AA_MIN_WIDTH_PX)
  const halfAa = Math.max(pixelsPerAa, BASE_MIN_WIDTH_PX) / 2 // Anchor on the center of the first AA
  const x = range.range.begin * pixelsPerAa - halfAa

  const rangeStr = formatRange(range.range)

  return (
    <rect
      id={id}
      fill={unknownAaColor}
      x={x}
      y={-10}
      width={width}
      height="30"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      {...rest}
    >
      <Tooltip target={id} isOpen={showTooltip} fullWidth>
        <TableSlim borderless className="mb-1">
          <thead />
          <tbody>
            <tr>
              <td colSpan={2}>
                <h6>{t('Unknown aminoacid (X) range')}</h6>
              </td>
            </tr>

            <tr>
              <td>{t('Range')}</td>
              <td>{rangeStr}</td>
            </tr>

            <tr>
              <td>{t('Length')}</td>
              <td>{length}</td>
            </tr>
          </tbody>
        </TableSlim>
      </Tooltip>
    </rect>
  )
}

export const PeptideMarkerUnknown = React.memo(PeptideMarkerUnknownUnmemoed)
