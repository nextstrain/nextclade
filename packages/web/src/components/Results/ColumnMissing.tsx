import React, { useState } from 'react'
import { getSafeId } from 'src/helpers/getSafeId'
import { calculateNucleotidesTotals, ColumnSequenceNameTooltip } from 'src/components/Results/ColumnSequenceNameTooltip'
import { N } from 'src/algorithms/nucleotides'
import { ColumnCladeProps } from 'src/components/Results/ColumnClade'

export function ColumnMissing({ sequence }: ColumnCladeProps) {
  const [showTooltip, setShowTooltip] = useState<boolean>(false)

  const { missing, seqName } = sequence
  const id = getSafeId('ns-label', { seqName })
  const totalNs = calculateNucleotidesTotals(missing, N)

  return (
    <>
      <td
        id={id}
        className="results-table-col results-table-col-clade"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {totalNs}
      </td>
      <ColumnSequenceNameTooltip showTooltip={showTooltip} sequence={sequence} />
    </>
  )
}
