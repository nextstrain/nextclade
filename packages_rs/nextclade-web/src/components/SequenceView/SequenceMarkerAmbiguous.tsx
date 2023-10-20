import React, { SVGProps, useCallback, useMemo, useState } from 'react'
import { useRecoilValue } from 'recoil'
import { get } from 'lodash'
import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'
import type { NucleotideRange } from 'src/types'
import { Tooltip } from 'src/components/Results/Tooltip'
import { BASE_MIN_WIDTH_PX } from 'src/constants'
import { formatRange } from 'src/helpers/formatRange'
import { getNucleotideColor } from 'src/helpers/getNucleotideColor'
import { getSafeId } from 'src/helpers/getSafeId'
import {
  getSeqMarkerDims,
  SeqMarkerHeightState,
  seqMarkerAmbiguousHeightStateAtom,
} from 'src/state/seqViewSettings.state'

export interface AmbiguousViewProps extends SVGProps<SVGRectElement> {
  index: number
  seqName: string
  ambiguous: NucleotideRange
  pixelsPerBase: number
}

export function SequenceMarkerAmbiguousUnmemoed({
  index,
  seqName,
  ambiguous,
  pixelsPerBase,
  ...rest
}: AmbiguousViewProps) {
  const { t } = useTranslation()
  const [showTooltip, setShowTooltip] = useState(false)
  const onMouseEnter = useCallback(() => setShowTooltip(true), [])
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])

  const seqMarkerAmbiguousHeightState = useRecoilValue(seqMarkerAmbiguousHeightStateAtom)
  const { y, height } = useMemo(() => getSeqMarkerDims(seqMarkerAmbiguousHeightState), [seqMarkerAmbiguousHeightState])

  const { character, range: { begin, end }, range } = ambiguous // prettier-ignore
  const rangeStr = formatRange(range)

  const text = useMemo(() => {
    const AMBIGUOUS_NUCS = {
      R: t('A or G'),
      K: t('G or T'),
      S: t('G or C'),
      Y: t('C or T'),
      M: t('A or C'),
      W: t('A or T'),
      B: t('not A (C, G or T)'),
      H: t('not G (A, C or T)'),
      D: t('not C (A, G or T)'),
      V: t('not T (A, C or G)'),
    }
    const disambiguated = get(AMBIGUOUS_NUCS, character)

    let text = `${rangeStr}: ${character}`
    if (disambiguated) {
      text = `${text} (${disambiguated})`
    }

    return text
  }, [character, rangeStr, t])

  const ambiguousColor = getNucleotideColor(character)

  const id = getSafeId('ambiguous-marker', { index, seqName, character, begin, end })
  let width = (end - begin) * pixelsPerBase
  width = Math.max(width, BASE_MIN_WIDTH_PX)
  const halfNuc = Math.max(pixelsPerBase, BASE_MIN_WIDTH_PX) / 2 // Anchor in the center of the first nuc
  const x = begin * pixelsPerBase - halfNuc

  if (seqMarkerAmbiguousHeightState === SeqMarkerHeightState.Off) {
    return null
  }

  return (
    <rect
      id={id}
      fill={ambiguousColor}
      x={x}
      y={y}
      width={width}
      height={height}
      {...rest}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <Tooltip target={id} isOpen={showTooltip}>
        <p className="m-0">{t('Ambiguous:')}</p>
        <p className="m-0">{text}</p>
      </Tooltip>
    </rect>
  )
}

export const SequenceMarkerAmbiguous = React.memo(SequenceMarkerAmbiguousUnmemoed)
