import React, { SVGProps, useCallback, useMemo, useState } from 'react'

import type { AminoacidInsertion } from 'src/algorithms/types'
import { AA_MIN_WIDTH_PX } from 'src/constants'
import { Tooltip } from 'src/components/Results/Tooltip'
import { getSafeId } from 'src/helpers/getSafeId'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { ListOfInsertionsAa } from 'src/components/Results/ListOfInsertions'

export interface MissingViewProps extends SVGProps<SVGPolygonElement> {
  seqName: string
  insertion: AminoacidInsertion
  pixelsPerAa: number
}

function PeptideMarkerInsertionUnmemoed({ seqName, insertion, pixelsPerAa, ...rest }: MissingViewProps) {
  const { t } = useTranslationSafe()
  const [showTooltip, setShowTooltip] = useState(false)
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])
  const onMouseEnter = useCallback(() => setShowTooltip(true), [])

  const id = getSafeId('insertion-marker', { seqName, ...insertion })

  const { pos } = insertion
  const halfNuc = Math.max(pixelsPerAa, AA_MIN_WIDTH_PX) / 2 // Anchor on the center of the first nuc
  const x = pos * pixelsPerAa - halfNuc

  const insertions = useMemo(() => [insertion], [insertion])
  const pointsMain = useMemo(() => `${x} 10, ${x + 5} 19, ${x - 5} 19`, [x])
  const pointsOutline = useMemo(() => `${x} 7, ${x + 7} 22, ${x - 7} 22`, [x])

  return (
    <g id={id} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <polygon points={pointsOutline} fill={'#ffff00'} {...rest} />
      <polygon points={pointsMain} fill={'#ff0000'} {...rest} />
      <Tooltip target={id} isOpen={showTooltip} fullWidth>
        <h6>{t('Amino acid insertion')}</h6>
        <ListOfInsertionsAa insertions={insertions} totalInsertions={1} />
      </Tooltip>
    </g>
  )
}

export const PeptideMarkerInsertion = React.memo(PeptideMarkerInsertionUnmemoed)
