import React, { SVGProps, useState } from 'react'

import { useTranslation } from 'react-i18next'
import { BASE_MIN_WIDTH_PX } from 'src/constants'

import type { NucleotideMissing } from 'src/algorithms/types'
import { getNucleotideColor } from 'src/helpers/getNucleotideColor'
import { Tooltip } from 'src/components/Results/Tooltip'
import { formatRange } from 'src/helpers/formatRange'
import { getSafeId } from 'src/helpers/getSafeId'
import { N } from 'src/algorithms/nucleotides'

const missingColor = getNucleotideColor(N)

export interface MissingViewProps extends SVGProps<SVGRectElement> {
  seqName: string
  missing: NucleotideMissing
  pixelsPerBase: number
}

export function SequenceMarkerMissingUnmemoed({ seqName, missing, pixelsPerBase, ...rest }: MissingViewProps) {
  const { t } = useTranslation()
  const [showTooltip, setShowTooltip] = useState(false)

  const { begin, end } = missing // prettier-ignore

  const id = getSafeId('missing-marker', { seqName, ...missing })
  const x = begin * pixelsPerBase
  let width = (end - begin) * pixelsPerBase
  width = Math.max(width, BASE_MIN_WIDTH_PX)

  const rangeStr = formatRange(begin, end)

  return (
    <rect
      id={id}
      fill={missingColor}
      x={x}
      y={-10}
      width={width}
      height="30"
      {...rest}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Tooltip target={id} isOpen={showTooltip}>
        {t('Missing: {{range}}', { range: rangeStr })}
      </Tooltip>
    </rect>
  )
}
export const SequenceMarkerMissing = React.memo(SequenceMarkerMissingUnmemoed)
