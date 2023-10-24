/* eslint-disable sonarjs/no-duplicate-string */
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
      R: t('{{left}} or {{right}}', { left: 'A', right: 'G' }),
      K: t('{{left}} or {{right}}', { left: 'G', right: 'T' }),
      S: t('{{left}} or {{right}}', { left: 'G', right: 'C' }),
      Y: t('{{left}} or {{right}}', { left: 'C', right: 'T' }),
      M: t('{{left}} or {{right}}', { left: 'A', right: 'C' }),
      W: t('{{left}} or {{right}}', { left: 'A', right: 'T' }),
      B: t('not {{left}} ({{r1}}, {{r2}} or {{r3}})', { left: 'A', r1: 'C', r2: 'G', r3: 'T' }),
      H: t('not {{left}} ({{r1}}, {{r2}} or {{r3}})', { left: 'G', r1: 'A', r2: 'C', r3: 'T' }),
      D: t('not {{left}} ({{r1}}, {{r2}} or {{r3}})', { left: 'C', r1: 'A', r2: 'G', r3: 'T' }),
      V: t('not {{left}} ({{r1}}, {{r2}} or {{r3}})', { left: 'T', r1: 'A', r2: 'C', r3: 'G' }),
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
