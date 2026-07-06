import React, { useCallback, useState } from 'react'
import type { Range } from 'src/types'
import { TableSlim } from 'src/components/Common/TableSlim'
import { Tooltip } from 'src/components/Results/Tooltip'
import { BASE_MIN_WIDTH_PX } from 'src/constants'
import { formatRange } from 'src/helpers/formatRange'
import { getSafeId } from 'src/helpers/getSafeId'
import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'

const recombinationColor = '#8f2fd4'
const recombinationBorderColor = '#e0b3ff'

export interface RecombinationMarkerProps {
  index: number
  seqName: string
  region: Range
  pixelsPerBase: number
}

export const SequenceMarkerRecombination = React.memo(SequenceMarkerRecombinationUnmemoed)

function SequenceMarkerRecombinationUnmemoed({ index, seqName, region, pixelsPerBase }: RecombinationMarkerProps) {
  const { t } = useTranslation()
  const [showTooltip, setShowTooltip] = useState(false)
  const onMouseEnter = useCallback(() => setShowTooltip(true), [])
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])

  const id = getSafeId('recombination-marker', { index, seqName, begin: region.begin, end: region.end })

  const nucLength = region.end - region.begin
  const width = Math.max(nucLength * pixelsPerBase, BASE_MIN_WIDTH_PX)
  const halfNuc = Math.max(pixelsPerBase, BASE_MIN_WIDTH_PX) / 2 // Anchor on the center of the first nuc
  const x = region.begin * pixelsPerBase - halfNuc

  // Recombinant intervals may span multiple genes, so gene and codon labels are intentionally omitted.
  return (
    <g>
      <rect
        fill={recombinationBorderColor}
        x={x - 1}
        y={1.75}
        width={width + 2}
        stroke={recombinationBorderColor}
        strokeWidth={0.5}
        height={7}
      />
      <rect
        id={id}
        fill={recombinationColor}
        x={x}
        y={2.5}
        width={width}
        height="5"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <Tooltip target={id} isOpen={showTooltip} fullWidth>
          <h5>{t('Putative recombinant')}</h5>

          <TableSlim borderless className="mb-1">
            <thead />
            <tbody>
              <tr>
                <td>{t('Nucleotide range')}</td>
                <td>{formatRange(region)}</td>
              </tr>

              <tr>
                <td>{t('Nucleotide length')}</td>
                <td>{nucLength}</td>
              </tr>
            </tbody>
          </TableSlim>
        </Tooltip>
      </rect>
    </g>
  )
}
