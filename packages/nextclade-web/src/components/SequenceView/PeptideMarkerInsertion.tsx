import React, { SVGProps, useCallback, useMemo, useState } from 'react'
import { useTheme } from 'styled-components'

import type { AaIns } from 'src/types'
import { AA_MIN_WIDTH_PX } from 'src/constants'
import { Tooltip } from 'src/components/Results/Tooltip'
import { getSafeId } from 'src/helpers/getSafeId'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { ListOfInsertionsAa } from 'src/components/Results/ListOfInsertions'

export interface MissingViewProps extends SVGProps<SVGPolygonElement> {
  index: number
  seqName: string
  insertion: AaIns
  pixelsPerAa: number
}

function PeptideMarkerInsertionUnmemoed({ index, seqName, insertion, pixelsPerAa, ...rest }: MissingViewProps) {
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
  const halfNuc = Math.max(pixelsPerAa, AA_MIN_WIDTH_PX) / 2 // Anchor on the center of the first nuc
  const x = pos * pixelsPerAa - halfNuc

  const insertions = useMemo(() => [insertion], [insertion])
  const pointsMain = useMemo(() => `${x} 10, ${x + 5} 19, ${x - 5} 19`, [x])
  const pointsOutline = useMemo(() => `${x} 7, ${x + 7} 22, ${x - 7} 22`, [x])

  return (
    <g id={id} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <polygon points={pointsOutline} fill={outline} {...rest} />
      <polygon points={pointsMain} fill={background} {...rest} />
      <Tooltip target={id} isOpen={showTooltip} fullWidth>
        <h6>{t('Amino acid insertion')}</h6>
        <ListOfInsertionsAa insertions={insertions} totalInsertions={1} />
      </Tooltip>
    </g>
  )
}

export const PeptideMarkerInsertion = React.memo(PeptideMarkerInsertionUnmemoed)
