import React, { SVGProps, useState, PropsWithChildren, memo } from 'react'

import { useTranslation } from 'react-i18next'
import { BASE_MIN_WIDTH_PX } from 'src/constants'

import { Tooltip } from 'src/components/Results/Tooltip'
import { formatRange } from 'src/helpers/formatRange'
import { getSafeId } from 'src/helpers/getSafeId'

const colorUnsequenced = '#BBBBBB'

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

  const x = begin * pixelsPerBase
  let width = (end - begin) * pixelsPerBase
  width = Math.max(width, BASE_MIN_WIDTH_PX)

  if (begin >= end) {
    console.warn(
      `SequenceMarker: Attmpted to draw an invalid marker for range: \`[${begin}; ${end})\`. This is probably a bug.`,
    )
    return null
  }

  return (
    <rect
      id={id}
      fill={colorUnsequenced}
      x={x}
      y={-10}
      width={width}
      height="30"
      {...restProps}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Tooltip target={id} isOpen={showTooltip}>
        {children}
      </Tooltip>
    </rect>
  )
})

export interface SequenceMarkerUnsequencedStartProps {
  seqName: string
  alignmentStart: number
  pixelsPerBase: number
}

export const SequenceMarkerUnsequencedStart = memo(
  ({ seqName, alignmentStart, pixelsPerBase }: SequenceMarkerUnsequencedStartProps) => {
    const { t } = useTranslation()

    const id = getSafeId('sequence-marker-unsequenced-start', { seqName, alignmentStart })

    const begin = 0
    const length = alignmentStart
    const end = begin + length

    if (begin >= end) {
      return null
    }

    return (
      <SequenceMarker id={id} begin={begin} end={end} pixelsPerBase={pixelsPerBase}>
        {t('Not sequenced: {{range}}', { range: formatRange(begin, end) })}
      </SequenceMarker>
    )
  },
)

export interface SequenceMarkerUnsequencedEndProps {
  seqName: string
  genomeSize: number
  alignmentEnd: number
  pixelsPerBase: number
}

export const SequenceMarkerUnsequencedEnd = memo(
  ({ seqName, genomeSize, alignmentEnd, pixelsPerBase }: SequenceMarkerUnsequencedEndProps) => {
    const { t } = useTranslation()

    const id = getSafeId('sequence-marker-unsequenced-end', { seqName, alignmentEnd })

    const begin = alignmentEnd
    const length = genomeSize - alignmentEnd
    const end = begin + length

    if (begin >= end) {
      return null
    }

    return (
      <SequenceMarker id={id} begin={begin} end={end} pixelsPerBase={pixelsPerBase}>
        {t('Not sequenced: {{range}}', { range: formatRange(begin, end) })}
      </SequenceMarker>
    )
  },
)
