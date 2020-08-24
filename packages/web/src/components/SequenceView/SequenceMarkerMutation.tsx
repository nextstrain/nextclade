import React, { SVGProps, useState } from 'react'

import { useTranslation } from 'react-i18next'

import { BASE_MIN_WIDTH_PX } from 'src/constants'

import type { SubstitutionsWithAminoacids } from 'src/algorithms/types'

import { getNucleotideColor } from 'src/helpers/getNucleotideColor'
import { formatMutation } from 'src/helpers/formatMutation'

import { Tooltip } from 'src/components/Results/Tooltip'
import { getSafeId } from 'src/helpers/getSafeId'
import { ListOfAminoacidChanges } from 'src/components/SequenceView/ListOfAminoacidChanges'

export interface SequenceMarkerMutationProps extends SVGProps<SVGRectElement> {
  seqName: string
  substitution: SubstitutionsWithAminoacids
  pixelsPerBase: number
}

function SequenceMarkerMutationUnmemoed({
  seqName,
  substitution,
  pixelsPerBase,
  onClick,
  ...rest
}: SequenceMarkerMutationProps) {
  const { t } = useTranslation()
  const [showTooltip, setShowTooltip] = useState(false)

  const { pos, queryNuc, refNuc, aaSubstitutions } = substitution
  const id = getSafeId('mutation-marker', { seqName, ...substitution })

  const mut = formatMutation({ pos, queryNuc, refNuc })

  const fill = getNucleotideColor(queryNuc)
  const x = pos * pixelsPerBase
  const width = Math.max(BASE_MIN_WIDTH_PX, 1 * pixelsPerBase)

  return (
    <rect
      id={id}
      fill={fill}
      x={x}
      y={-10}
      width={width}
      height="30"
      {...rest}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Tooltip target={id} isOpen={showTooltip}>
        <div>{t('Nucleotide mutation: {{mutation}}', { mutation: mut })}</div>
        <ListOfAminoacidChanges aminoacidChanges={aaSubstitutions} />
      </Tooltip>
    </rect>
  )
}

export const SequenceMarkerMutation = React.memo(SequenceMarkerMutationUnmemoed)
