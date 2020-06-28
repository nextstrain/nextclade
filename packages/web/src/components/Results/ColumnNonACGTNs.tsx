import React from 'react'

import { ColumnCladeProps } from 'src/components/Results/ColumnClade'
import { getSafeId } from 'src/helpers/getSafeId'

export function ColumnNonACGTNs({ sequence }: ColumnCladeProps) {
  const { diagnostics, seqName } = sequence
  const id = getSafeId('nonacgtn-label', { seqName })
  const goodBases = new Set(['A', 'C', 'G', 'T', 'N', '-'])
  const nonACGTN = Object.keys(diagnostics.nucleotideComposition)
    .filter((d) => !goodBases.has(d))
    .reduce((a, b) => a + diagnostics.nucleotideComposition[b], 0)

  return (
    <>
      <td id={id} className="results-table-col results-table-col-clade">
        {nonACGTN}
      </td>
    </>
  )
}
