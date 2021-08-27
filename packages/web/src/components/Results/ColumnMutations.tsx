import React, { useState } from 'react'

import { getSafeId } from 'src/helpers/getSafeId'
import { TableSlim } from 'src/components/Common/TableSlim'
import { ColumnCladeProps } from 'src/components/Results/ColumnClade'
import { ListOfMutations } from 'src/components/Results/ListOfMutations'
import { Tooltip } from 'src/components/Results/Tooltip'
import { ListOfAminoacidSubstitutions } from 'src/components/SequenceView/ListOfAminoacidSubstitutions'
import { ListOfAminoacidDeletions } from 'src/components/SequenceView/ListOfAminoacidDeletions'
import { ListOfPcrPrimerChanges } from 'src/components/SequenceView/ListOfPcrPrimerChanges'

export function ColumnMutations({ sequence }: ColumnCladeProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const { seqName, substitutions, aaDeletions, aaSubstitutions, pcrPrimerChanges, totalPcrPrimerChanges } = sequence
  const id = getSafeId('mutations-label', { seqName })
  const totalMutations = substitutions.length

  return (
    <div id={id} className="w-100" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
      {totalMutations}
      <Tooltip isOpen={showTooltip} target={id} wide fullWidth>
        <TableSlim borderless className="mb-1">
          <thead />
          <tbody>
            <ListOfMutations substitutions={substitutions} />
            <ListOfAminoacidSubstitutions aminoacidSubstitutions={aaSubstitutions} />
            <ListOfAminoacidDeletions aminoacidDeletions={aaDeletions} />
            <ListOfPcrPrimerChanges pcrPrimerChanges={pcrPrimerChanges} totalPcrPrimerChanges={totalPcrPrimerChanges} />
          </tbody>
        </TableSlim>
      </Tooltip>
    </div>
  )
}
