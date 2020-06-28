import React, { useState } from 'react'

import { ColumnCladeProps } from 'src/components/Results/ColumnClade'
import { getSafeId } from 'src/helpers/getSafeId'
import { ColumnSequenceNameTooltip } from 'src/components/Results/ColumnSequenceNameTooltip'

export function ColumnMutations({ sequence }: ColumnCladeProps) {
  const [showTooltip, setShowTooltip] = useState<boolean>(false)

  const { seqName, substitutions } = sequence
  const id = getSafeId('mutations-label', { seqName })
  const totalMutations = substitutions.length

  return (
    <>
      <td
        id={id}
        className="results-table-col results-table-col-clade"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {totalMutations}
      </td>
      <ColumnSequenceNameTooltip showTooltip={showTooltip} sequence={sequence} />
    </>
  )
}
