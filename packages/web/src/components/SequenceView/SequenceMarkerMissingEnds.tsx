import React, { SVGProps, useState } from 'react'

import { useTranslation } from 'react-i18next'
import { BASE_MIN_WIDTH_PX } from 'src/constants'

import type { NucleotideDeletion } from 'src/algorithms/types'
import { Tooltip } from 'src/components/Results/Tooltip'
import { formatRange } from 'src/helpers/formatRange'
import { getSafeId } from 'src/helpers/getSafeId'

const missingEndColor = '#BBBBBB'

export interface MissingEndsViewProps extends SVGProps<SVGRectElement> {
  seqName: string
  deletion: NucleotideDeletion
  pixelsPerBase: number
}

export function SequenceMarkerMissingEndsUnmemoed({ seqName, deletion, pixelsPerBase, ...rest }: MissingEndsViewProps) {
  const { t } = useTranslation()
  const [showTooltip, setShowTooltip] = useState(false)

  const { start: begin, length } = deletion
  const end = begin + length

  const id = getSafeId('missing-end-marker', { seqName, ...deletion })

  const x = begin * pixelsPerBase
  let width = (end - begin) * pixelsPerBase
  width = Math.max(width, BASE_MIN_WIDTH_PX)

  const rangeStr = formatRange(begin, end)

  return (
    <rect
      id={id}
      fill={missingEndColor}
      x={x}
      y={-10}
      width={width}
      height="30"
      {...rest}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Tooltip target={id} isOpen={showTooltip}>
        {t('Not sequenced: {{range}}', { range: rangeStr })}
      </Tooltip>
    </rect>
  )
}

export const SequenceMarkerMissingEnds = React.memo(SequenceMarkerMissingEndsUnmemoed)
