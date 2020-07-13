import React, { SVGProps, useState } from 'react'

import { useTranslation } from 'react-i18next'

import { BASE_MIN_WIDTH_PX } from 'src/constants'

import type { CladeDataGrouped } from 'src/algorithms/types'
import { getSafeId } from 'src/helpers/getSafeId'
import { Tooltip } from 'src/components/Results/Tooltip'

const GENE_MAP_CLADE_MARK_COLOR = '#444444aa' as const

export interface CladeMarkerProps extends SVGProps<SVGRectElement> {
  cladeDatum: CladeDataGrouped
  pixelsPerBase: number
}

export function CladeMarker({ cladeDatum, pixelsPerBase, ...rest }: CladeMarkerProps) {
  const { t } = useTranslation()
  const [showTooltip, setShowTooltip] = useState(false)
  const { pos, subs } = cladeDatum

  const id = getSafeId('clade-marker', { pos })
  const fill = GENE_MAP_CLADE_MARK_COLOR
  const x = pos * pixelsPerBase
  const width = Math.max(BASE_MIN_WIDTH_PX, 1 * pixelsPerBase)

  const mutationItems = Object.entries(subs as Record<string, string[]>).map(([nuc, clades]) => {
    return <li key={nuc}>{`${nuc}: ${clades.join(', ')}`}</li>
  })

  return (
    <rect
      id={id}
      fill={fill}
      x={x}
      width={width}
      {...rest}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Tooltip target={id} isOpen={showTooltip} placement="top-start">
        <div>{t('Position: {{position}}', { position: pos })}</div>
        <div>{t('Clade-defining mutation:')}</div>
        <div>
          <ul>{mutationItems}</ul>
        </div>
      </Tooltip>
    </rect>
  )
}
