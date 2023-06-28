import React, { SVGProps, useCallback, useMemo, useState } from 'react'
import { useRecoilValue } from 'recoil'
import { get, sortBy, uniqBy } from 'lodash'
import { AaSub, iterRange, NucDelRange, rangeLen } from 'src/types'
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
  deletion: NucDelRange
  nucToAaMuts: Record<string, AaSub[]>
  pixelsPerBase: number
  offsetPos?: number
}

function SequenceMarkerGapUnmemoed({
  index,
  seqName,
  deletion,
  nucToAaMuts,
  pixelsPerBase,
  offsetPos = 0,
  ...rest
}: MissingViewProps) {
  const { t } = useTranslationSafe()
  const [showTooltip, setShowTooltip] = useState(false)
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])
  const onMouseEnter = useCallback(() => setShowTooltip(true), [])

  const seqMarkerGapHeightState = useRecoilValue(seqMarkerGapHeightStateAtom)
  const { y, height } = useMemo(() => getSeqMarkerDims(seqMarkerGapHeightState), [seqMarkerGapHeightState])

  const { range /* aaSubstitutions, aaDeletions */ } = deletion
  const id = getSafeId('gap-marker', { index, seqName, ...range })

  let width = rangeLen(range) * pixelsPerBase
  width = Math.max(width, BASE_MIN_WIDTH_PX)
  const halfNuc = Math.max(pixelsPerBase, BASE_MIN_WIDTH_PX) / 2 // Anchor on the center of the first nuc
  const x = (range.begin - offsetPos) * pixelsPerBase - halfNuc

  const rangeStr = formatRange(range)

  if (seqMarkerGapHeightState === SeqMarkerHeightState.Off) {
    return null
  }

  const aaChanges = uniqBy(
    sortBy(
      iterRange(range).flatMap((pos) => get(nucToAaMuts, pos.toString(10)) ?? []),
      (mut) => mut.pos,
    ),
    (mut) => mut.pos,
  )

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
                <h6>{t('Nucleotide deletion: {{range}}', { range: rangeStr })}</h6>
              </td>
            </tr>

            <tr>
              <td colSpan={2}>
                <ListOfAaChangesFlatTruncated aaChanges={aaChanges} maxRows={6} />
              </td>
            </tr>
          </tbody>
        </TableSlim>
      </Tooltip>
    </rect>
  )
}

export const SequenceMarkerGap = React.memo(SequenceMarkerGapUnmemoed)
