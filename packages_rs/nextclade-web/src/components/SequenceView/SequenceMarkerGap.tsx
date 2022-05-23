import React, { SVGProps, useCallback, useMemo, useState } from 'react'
import { useRecoilValue } from 'recoil'

import { BASE_MIN_WIDTH_PX, GAP } from 'src/constants'
import type { NucleotideDeletion } from 'src/algorithms/types'
import { getNucleotideColor } from 'src/helpers/getNucleotideColor'
import { Tooltip } from 'src/components/Results/Tooltip'
import { TableSlim } from 'src/components/Common/TableSlim'
import { formatRange } from 'src/helpers/formatRange'
import { getSafeId } from 'src/helpers/getSafeId'
import { AminoacidMutationBadge } from 'src/components/Common/MutationBadge'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { getSeqMarkerDims, seqMarkerGapHeightStateAtom, SeqMarkerHeightState } from 'src/state/seqViewSettings.state'

const gapColor = getNucleotideColor(GAP)

export interface MissingViewProps extends SVGProps<SVGRectElement> {
  seqName: string
  deletion: NucleotideDeletion
  pixelsPerBase: number
}

function SequenceMarkerGapUnmemoed({ seqName, deletion, pixelsPerBase, ...rest }: MissingViewProps) {
  const { t } = useTranslationSafe()
  const [showTooltip, setShowTooltip] = useState(false)
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])
  const onMouseEnter = useCallback(() => setShowTooltip(true), [])

  const seqMarkerGapHeightState = useRecoilValue(seqMarkerGapHeightStateAtom)
  const { y, height } = useMemo(() => getSeqMarkerDims(seqMarkerGapHeightState), [seqMarkerGapHeightState])

  if (seqMarkerGapHeightState === SeqMarkerHeightState.Off) {
    return null
  }

  const { start: begin, length, aaSubstitutions, aaDeletions } = deletion
  const end = begin + length

  const id = getSafeId('gap-marker', { seqName, ...deletion })

  let width = (end - begin) * pixelsPerBase
  width = Math.max(width, BASE_MIN_WIDTH_PX)
  const halfNuc = Math.max(pixelsPerBase, BASE_MIN_WIDTH_PX) / 2 // Anchor on the center of the first nuc
  const x = begin * pixelsPerBase - halfNuc

  const rangeStr = formatRange(begin, end)

  const totalAaChanges = aaSubstitutions.length + aaDeletions.length

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

            {aaSubstitutions.map((mut) => (
              <tr key={mut.codon}>
                <td>{t('Aminoacid substitution')}</td>
                <td>
                  <AminoacidMutationBadge mutation={mut} />
                </td>
              </tr>
            ))}

            {aaDeletions.map((del) => (
              <tr key={del.queryContext}>
                <td>{t('Aminoacid deletion')}</td>
                <td>
                  <AminoacidMutationBadge mutation={del} />
                </td>
              </tr>
            ))}
          </tbody>
        </TableSlim>
      </Tooltip>
    </rect>
  )
}

export const SequenceMarkerGap = React.memo(SequenceMarkerGapUnmemoed)
