import React, { SVGProps, useCallback, useMemo, useState } from 'react'

import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'
import { useRecoilValue } from 'recoil'

import type { NucleotideMissing } from 'src/types'
import { Tooltip } from 'src/components/Results/Tooltip'
import { BASE_MIN_WIDTH_PX, N } from 'src/constants'
import { formatRange } from 'src/helpers/formatRange'
import { getNucleotideColor } from 'src/helpers/getNucleotideColor'
import { getSafeId } from 'src/helpers/getSafeId'
import {
  getSeqMarkerDims,
  SeqMarkerHeightState,
  seqMarkerMissingHeightStateAtom,
} from 'src/state/seqViewSettings.state'

const missingColor = getNucleotideColor(N)

export interface MissingViewProps extends SVGProps<SVGRectElement> {
  index: number
  seqName: string
  missing: NucleotideMissing
  pixelsPerBase: number
}

export function SequenceMarkerMissingUnmemoed({ index, seqName, missing, pixelsPerBase, ...rest }: MissingViewProps) {
  const { t } = useTranslation()
  const [showTooltip, setShowTooltip] = useState(false)
  const onMouseEnter = useCallback(() => setShowTooltip(true), [])
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])

  const seqMarkerMissingHeightState = useRecoilValue(seqMarkerMissingHeightStateAtom)
  const { y, height } = useMemo(() => getSeqMarkerDims(seqMarkerMissingHeightState), [seqMarkerMissingHeightState])

  if (seqMarkerMissingHeightState === SeqMarkerHeightState.Off) {
    return null
  }

  const { begin, end } = missing.range // prettier-ignore

  const id = getSafeId('missing-marker', { index, seqName, ...missing.range })
  let width = (end - begin) * pixelsPerBase
  width = Math.max(width, BASE_MIN_WIDTH_PX)
  const halfNuc = Math.max(pixelsPerBase, BASE_MIN_WIDTH_PX) / 2 // Anchor on the center of the first nuc
  const x = begin * pixelsPerBase - halfNuc

  const rangeStr = formatRange(missing.range)

  return (
    <rect
      id={id}
      fill={missingColor}
      x={x}
      y={y}
      width={width}
      height={height}
      {...rest}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <Tooltip target={id} isOpen={showTooltip}>
        {t('Missing: {{range}}', { range: rangeStr })}
      </Tooltip>
    </rect>
  )
}

export const SequenceMarkerMissing = React.memo(SequenceMarkerMissingUnmemoed)
