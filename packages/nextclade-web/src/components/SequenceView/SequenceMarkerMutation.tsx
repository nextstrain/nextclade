import React, { SVGProps, useCallback, useMemo, useState } from 'react'
import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'
import { useRecoilValue } from 'recoil'
import type { AaSub, NucSub } from 'src/types'
import { NucleotideMutationBadge } from 'src/components/Common/MutationBadge'
import { TableSlim } from 'src/components/Common/TableSlim'
import { Tooltip } from 'src/components/Results/Tooltip'
import { BASE_MIN_WIDTH_PX } from 'src/constants'
import { getNucleotideColor } from 'src/helpers/getNucleotideColor'
import { getSafeId } from 'src/helpers/getSafeId'
import {
  getSeqMarkerDims,
  SeqMarkerHeightState,
  seqMarkerMutationHeightStateAtom,
} from 'src/state/seqViewSettings.state'
import { get } from 'lodash'
import { ListOfAaChangesFlatTruncated } from 'src/components/SequenceView/ListOfAaChangesFlatTruncated'

export interface SequenceMarkerMutationProps extends SVGProps<SVGRectElement> {
  index: number
  seqName: string
  substitution: NucSub
  nucToAaMuts?: Record<string, AaSub[]>
  pixelsPerBase: number
}

function SequenceMarkerMutationUnmemoed({
  index,
  seqName,
  substitution,
  nucToAaMuts,
  pixelsPerBase,
  ...rest
}: SequenceMarkerMutationProps) {
  const { t } = useTranslation()
  const [showTooltip, setShowTooltip] = useState(false)
  const onMouseEnter = useCallback(() => setShowTooltip(true), [])
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])

  const seqMarkerMutationHeightState = useRecoilValue(seqMarkerMutationHeightStateAtom)
  const { y, height } = useMemo(() => getSeqMarkerDims(seqMarkerMutationHeightState), [seqMarkerMutationHeightState])

  if (seqMarkerMutationHeightState === SeqMarkerHeightState.Off) {
    return null
  }

  const { pos, qryNuc /* , aaSubstitutions, aaDeletions */ } = substitution
  const id = getSafeId('mutation-marker', { index, seqName, ...substitution })

  const fill = getNucleotideColor(qryNuc)
  const width = Math.max(BASE_MIN_WIDTH_PX, pixelsPerBase)
  const halfNuc = Math.max(pixelsPerBase, BASE_MIN_WIDTH_PX) / 2 // Anchor on the center of the first nuc
  const x = pos * pixelsPerBase - halfNuc

  const aaChanges = get(nucToAaMuts, pos.toString(10)) ?? []

  return (
    <rect
      id={id}
      fill={fill}
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
                <h6>
                  <span>{t('Nucleotide substitution')}</span>
                  <span> </span>
                  <span>
                    <NucleotideMutationBadge mutation={substitution} />
                  </span>
                </h6>
              </td>
            </tr>

            <ListOfAaChangesFlatTruncated aaChanges={aaChanges} maxRows={6} />
          </tbody>
        </TableSlim>
      </Tooltip>
    </rect>
  )
}

export const SequenceMarkerMutation = React.memo(SequenceMarkerMutationUnmemoed)
