import React, { useState } from 'react'

import type { AnalysisResult } from 'src/algorithms/types'

import { getSafeId } from 'src/helpers/getSafeId'
import { ColumnSequenceNameTooltip } from 'src/components/Results/ColumnSequenceNameTooltip'

export interface ColumnCladeProps {
  sequence: AnalysisResult
}

export function ColumnClade({ sequence }: ColumnCladeProps) {
  const [showTooltip, setShowTooltip] = useState<boolean>(false)

  const { clades, seqName } = sequence
  const id = getSafeId('clade-label', { seqName })
  const assignedClades = Object.keys(clades).map((c) => c)
  const cladesStr = assignedClades.length > 0 ? assignedClades[assignedClades.length - 1] : '--'

  return (
    <>
      <td
        id={id}
        className="results-table-col results-table-col-clade"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {cladesStr}
      </td>
      <ColumnSequenceNameTooltip showTooltip={showTooltip} sequence={sequence} />
    </>
  )
}
