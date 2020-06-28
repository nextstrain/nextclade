import React, { useState } from 'react'
import { getSafeId } from 'src/helpers/getSafeId'
import { ColumnSequenceNameTooltip } from 'src/components/Results/ColumnSequenceNameTooltip'
import { ColumnCladeProps } from 'src/components/Results/ColumnClade'

export function ColumnGaps({ sequence }: ColumnCladeProps) {
  const [showTooltip, setShowTooltip] = useState<boolean>(false)

  const { deletions, seqName } = sequence
  const id = getSafeId('gaps-label', { seqName })

  const totalGaps = deletions.reduce((acc, curr) => acc + curr.length, 0)

  return (
    <>
      <td
        id={id}
        className="results-table-col results-table-col-clade"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {totalGaps}
      </td>
      <ColumnSequenceNameTooltip showTooltip={showTooltip} sequence={sequence} />
    </>
  )
}
