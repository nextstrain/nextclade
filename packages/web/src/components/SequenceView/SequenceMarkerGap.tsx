import React, { SVGProps, useState } from 'react'

import { useTranslation } from 'react-i18next'
import { ListOfAminoacidDeletions } from 'src/components/SequenceView/ListOfAminoacidDeletions'
import { BASE_MIN_WIDTH_PX } from 'src/constants'

import type { NucleotideDeletionWithAminoacids } from 'src/algorithms/types'
import { getNucleotideColor } from 'src/helpers/getNucleotideColor'
import { Tooltip } from 'src/components/Results/Tooltip'
import { formatRange } from 'src/helpers/formatRange'
import { getSafeId } from 'src/helpers/getSafeId'
import { GAP } from 'src/algorithms/nucleotides'

const gapColor = getNucleotideColor(GAP)

export interface MissingViewProps extends SVGProps<SVGRectElement> {
  seqName: string
  deletion: NucleotideDeletionWithAminoacids
  pixelsPerBase: number
}

function SequenceMarkerGapUnmemoed({ seqName, deletion, pixelsPerBase, ...rest }: MissingViewProps) {
  const { t } = useTranslation()
  const [showTooltip, setShowTooltip] = useState(false)

  const { start: begin, length, aaDeletions } = deletion
  const end = begin + length

  const id = getSafeId('gap-marker', { seqName, ...deletion })

  const x = begin * pixelsPerBase
  let width = (end - begin) * pixelsPerBase
  width = Math.max(width, BASE_MIN_WIDTH_PX)

  const rangeStr = formatRange(begin, end)

  return (
    <rect
      id={id}
      fill={gapColor}
      x={x}
      y={-10}
      width={width}
      height="30"
      {...rest}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Tooltip target={id} isOpen={showTooltip}>
        {t('Gap: {{range}}', { range: rangeStr })}
        <ListOfAminoacidDeletions aminoacidDeletions={aaDeletions} />
      </Tooltip>
    </rect>
  )
}

export const SequenceMarkerGap = React.memo(SequenceMarkerGapUnmemoed)
