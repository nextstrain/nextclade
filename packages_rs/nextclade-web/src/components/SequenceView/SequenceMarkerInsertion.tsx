import React, { SVGProps, useCallback, useMemo, useState } from 'react'
import { useTheme } from 'styled-components'

import { BASE_MIN_WIDTH_PX } from 'src/constants'
import type { NucleotideInsertion } from 'src/types'
import { Tooltip } from 'src/components/Results/Tooltip'
import { getSafeId } from 'src/helpers/getSafeId'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { ListOfInsertionsNuc } from 'src/components/Results/ListOfInsertions'

export interface MissingViewProps extends SVGProps<SVGPolygonElement> {
  index: number
  seqName: string
  insertion: NucleotideInsertion
  pixelsPerBase: number
  offsetPos?: number
}

function SequenceMarkerInsertionUnmemoed({
  index,
  seqName,
  insertion,
  pixelsPerBase,
  offsetPos = 0,
  ...rest
}: MissingViewProps) {
  const {
    seqView: {
      markers: {
        insertions: { background, outline },
      },
    },
  } = useTheme()

  const { t } = useTranslationSafe()
  const [showTooltip, setShowTooltip] = useState(false)
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])
  const onMouseEnter = useCallback(() => setShowTooltip(true), [])

  const id = getSafeId('insertion-marker', { index, seqName, ...insertion })

  const { pos } = insertion
  const halfNuc = Math.max(pixelsPerBase, BASE_MIN_WIDTH_PX) / 2 // Anchor on the center of the first nuc
  const x = (pos - offsetPos) * pixelsPerBase - halfNuc

  const insertions = useMemo(() => [insertion], [insertion])
  const pointsMain = useMemo(() => `${x} 10, ${x + 5} 19, ${x - 5} 19`, [x])
  const pointsOutline = useMemo(() => `${x} 7, ${x + 7} 22, ${x - 7} 22`, [x])

  return (
    <g id={id} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <polygon points={pointsOutline} fill={outline} {...rest} />
      <polygon points={pointsMain} fill={background} {...rest} />
      <Tooltip target={id} isOpen={showTooltip} fullWidth>
        <h6>{t('Nucleotide insertion')}</h6>
        <ListOfInsertionsNuc insertions={insertions} totalInsertions={1} />
      </Tooltip>
    </g>
  )
}

export const SequenceMarkerInsertion = React.memo(SequenceMarkerInsertionUnmemoed)
