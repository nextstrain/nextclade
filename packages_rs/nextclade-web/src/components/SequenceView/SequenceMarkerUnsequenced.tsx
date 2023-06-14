import React, { memo, PropsWithChildren, SVGProps, useCallback, useMemo, useState } from 'react'

import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'
import { useRecoilValue } from 'recoil'

import { Tooltip } from 'src/components/Results/Tooltip'
import { BASE_MIN_WIDTH_PX } from 'src/constants'
import { formatRange } from 'src/helpers/formatRange'
import { getSafeId } from 'src/helpers/getSafeId'
import {
  getSeqMarkerDims,
  SeqMarkerHeightState,
  seqMarkerUnsequencedHeightStateAtom,
} from 'src/state/seqViewSettings.state'

const colorUnsequenced = '#bbbbbb'

export interface SequenceMarkerProps extends SVGProps<SVGRectElement> {
  id: string
  begin: number
  end: number
  pixelsPerBase: number
}

export const SequenceMarker = memo(function SequenceMarkerImpl({
  id,
  begin,
  end,
  pixelsPerBase,
  children,
  ...restProps
}: PropsWithChildren<SequenceMarkerProps>) {
  const [showTooltip, setShowTooltip] = useState(false)
  const onMouseEnter = useCallback(() => setShowTooltip(true), [])
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])

  const seqMarkerUnsequencedHeightState = useRecoilValue(seqMarkerUnsequencedHeightStateAtom)
  const { y, height } = useMemo(
    () => getSeqMarkerDims(seqMarkerUnsequencedHeightState),
    [seqMarkerUnsequencedHeightState],
  )

  if (seqMarkerUnsequencedHeightState === SeqMarkerHeightState.Off) {
    return null
  }

  let width = (end - begin) * pixelsPerBase
  width = Math.max(width, BASE_MIN_WIDTH_PX)
  const halfNuc = Math.max(pixelsPerBase, BASE_MIN_WIDTH_PX) / 2 // Anchor on the center of the first nuc
  const x = begin * pixelsPerBase - halfNuc

  if (begin >= end) {
    console.warn(
      `SequenceMarker: Attempted to draw an invalid marker for range: \`[${begin}; ${end})\`. This is probably a bug.`,
    )
    return null
  }

  return (
    <rect
      id={id}
      fill={colorUnsequenced}
      x={x}
      y={y}
      width={width}
      height={height}
      {...restProps}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <Tooltip target={id} isOpen={showTooltip}>
        {children}
      </Tooltip>
    </rect>
  )
})

export interface SequenceMarkerUnsequencedStartProps {
  index: number
  seqName: string
  alignmentStart: number
  pixelsPerBase: number
}

// eslint-disable-next-line react/display-name
export const SequenceMarkerUnsequencedStart = memo(
  ({ index, seqName, alignmentStart, pixelsPerBase }: SequenceMarkerUnsequencedStartProps) => {
    const { t } = useTranslation()

    const id = getSafeId('sequence-marker-unsequenced-start', { index, seqName, alignmentStart })

    const begin = 0
    const end = begin + alignmentStart

    if (begin >= end) {
      return null
    }

    return (
      <SequenceMarker id={id} begin={begin} end={end} pixelsPerBase={pixelsPerBase}>
        {t('Not sequenced: {{range}}', { range: formatRange({ begin, end }) })}
      </SequenceMarker>
    )
  },
)

export interface SequenceMarkerUnsequencedEndProps {
  index: number
  seqName: string
  genomeSize: number
  alignmentEnd: number
  pixelsPerBase: number
}

// eslint-disable-next-line react/display-name
export const SequenceMarkerUnsequencedEnd = memo(
  ({ index, seqName, genomeSize, alignmentEnd, pixelsPerBase }: SequenceMarkerUnsequencedEndProps) => {
    const { t } = useTranslation()

    const id = getSafeId('sequence-marker-unsequenced-end', { index, seqName, alignmentEnd })

    const begin = alignmentEnd
    const length = genomeSize - alignmentEnd
    const end = begin + length

    if (begin >= end) {
      return null
    }

    return (
      <SequenceMarker id={id} begin={begin} end={end} pixelsPerBase={pixelsPerBase}>
        {t('Not sequenced: {{range}}', { range: formatRange({ begin, end }) })}
      </SequenceMarker>
    )
  },
)
