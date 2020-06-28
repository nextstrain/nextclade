import React, { useState } from 'react'

import type { AnalysisResult } from 'src/algorithms/types'

import { getSafeId } from 'src/helpers/getSafeId'
import { ColumnSequenceNameTooltip } from 'src/components/Results/ColumnSequenceNameTooltip'

export interface ColumnNameProps {
  seqName: string
  sequence?: AnalysisResult
}

export function ColumnName({ seqName, sequence }: ColumnNameProps) {
  const [showTooltip, setShowTooltip] = useState<boolean>(false)
  const id = getSafeId('sequence-label', { seqName })

  return (
    <>
      <td
        id={id}
        className="results-table-col results-table-col-label"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {seqName}
      </td>
      {sequence && <ColumnSequenceNameTooltip showTooltip={showTooltip} sequence={sequence} />}
    </>
  )
}
