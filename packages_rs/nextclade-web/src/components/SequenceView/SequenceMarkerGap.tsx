import React, { SVGProps, useCallback, useMemo, useState } from 'react'
import { useRecoilValue } from 'recoil'

import type { NucDelFull, NucleotideDeletion } from 'src/types'
import { TableSlim } from 'src/components/Common/TableSlim'
import { Tooltip } from 'src/components/Results/Tooltip'
import { BASE_MIN_WIDTH_PX, GAP } from 'src/constants'
import { formatRange } from 'src/helpers/formatRange'
import { getNucleotideColor } from 'src/helpers/getNucleotideColor'
import { getSafeId } from 'src/helpers/getSafeId'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { getSeqMarkerDims, seqMarkerGapHeightStateAtom, SeqMarkerHeightState } from 'src/state/seqViewSettings.state'
import { ListOfAaChangesFlatTruncated } from 'src/components/SequenceView/ListOfAaChangesFlatTruncated'

const gapColor = getNucleotideColor(GAP)

export interface MissingViewProps extends SVGProps<SVGRectElement> {
  index: number
  seqName: string
  deletion: NucDelFull
  pixelsPerBase: number
}

function SequenceMarkerGapUnmemoed({ index, seqName, deletion, pixelsPerBase, ...rest }: MissingViewProps) {
  const { t } = useTranslationSafe()
  const [showTooltip, setShowTooltip] = useState(false)
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])
  const onMouseEnter = useCallback(() => setShowTooltip(true), [])

  const seqMarkerGapHeightState = useRecoilValue(seqMarkerGapHeightStateAtom)
  const { y, height } = useMemo(() => getSeqMarkerDims(seqMarkerGapHeightState), [seqMarkerGapHeightState])

  const { start: begin, length, aaSubstitutions, aaDeletions } = deletion
  const end = begin + length

  const id = getSafeId('gap-marker', { index, seqName, ...deletion })

  let width = (end - begin) * pixelsPerBase
  width = Math.max(width, BASE_MIN_WIDTH_PX)
  const halfNuc = Math.max(pixelsPerBase, BASE_MIN_WIDTH_PX) / 2 // Anchor on the center of the first nuc
  const x = begin * pixelsPerBase - halfNuc

  const rangeStr = formatRange(begin, end)

  const totalAaChanges = aaSubstitutions.length + aaDeletions.length

  if (seqMarkerGapHeightState === SeqMarkerHeightState.Off) {
    return null
  }

  return (
    <rect
      id={id}
      fill={gapColor}
      x={x}
      y={y}
      width={width}
      height={height}
      {...rest}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <Tooltip target={id} isOpen={showTooltip} fullWidth>
        <TableSlim borderless className="mb-1">
          <thead />
          <tbody>
            <tr>
              <td colSpan={2}>
                <h6>{t('Gap: {{range}}', { range: rangeStr })}</h6>
              </td>
            </tr>

            {totalAaChanges > 0 && (
              <tr>
                <td colSpan={2}>
                  <h6 className="mt-1">{t('Affected codons:')}</h6>
                </td>
              </tr>
            )}

            <tr>
              <td colSpan={2}>
                <ListOfAaChangesFlatTruncated
                  aaSubstitutions={aaSubstitutions}
                  aaDeletions={aaDeletions}
                  maxRows={10}
                />
              </td>
            </tr>
          </tbody>
        </TableSlim>
      </Tooltip>
    </rect>
  )
}

export const SequenceMarkerGap = React.memo(SequenceMarkerGapUnmemoed)
