import React, { useState } from 'react'

import type { AnalysisResult } from 'src/algorithms/types'
import { getSafeId } from 'src/helpers/getSafeId'
import { Tooltip } from 'src/components/Results/Tooltip'

export interface ColumnNonACGTNsProps {
  sequence: AnalysisResult
}

export function ColumnNonACGTNs({ sequence }: ColumnNonACGTNsProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const { diagnostics, seqName } = sequence

  const id = getSafeId('col-nonacgtn', { seqName })

  const goodBases = new Set(['A', 'C', 'G', 'T', 'N', '-'])

  const totalNonACGTN = Object.keys(diagnostics.nucleotideComposition)
    .filter((d) => !goodBases.has(d))
    .reduce((a, b) => a + diagnostics.nucleotideComposition[b], 0)

  return (
    <td
      id={id}
      className="results-table-col results-table-col-clade"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {totalNonACGTN}
      <Tooltip isOpen={showTooltip} target={id}>
        {/* TODO */}
        {'NOT YET IMPLEMENTED'}
      </Tooltip>
    </td>
  )
}
