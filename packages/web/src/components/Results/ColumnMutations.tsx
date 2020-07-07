import React, { useState } from 'react'

import { ColumnCladeProps } from 'src/components/Results/ColumnClade'
import { getSafeId } from 'src/helpers/getSafeId'
import { ListOfMutations } from 'src/components/Results/ListOfMutations'
import { Tooltip } from 'src/components/Results/Tooltip'
import { ListOfAminoacidChanges } from 'src/components/SequenceView/ListOfAminoacidChanges'

export function ColumnMutations({ sequence }: ColumnCladeProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const { seqName, substitutions, aminoacidChanges } = sequence
  const id = getSafeId('mutations-label', { seqName })
  const totalMutations = substitutions.length

  return (
    <div id={id} className="w-100" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
      {totalMutations}
      <Tooltip isOpen={showTooltip} target={id}>
        <ListOfMutations substitutions={substitutions} />
        <ListOfAminoacidChanges aminoacidChanges={aminoacidChanges} />
      </Tooltip>
    </div>
  )
}
