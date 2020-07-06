import React, { useState } from 'react'

import type { AnalysisResult } from 'src/algorithms/types'

import { getSafeId } from 'src/helpers/getSafeId'
import { ColumnNameTooltip } from 'src/components/Results/ColumnNameTooltip'

export interface ColumnNameProps {
  seqName: string
  sequence?: AnalysisResult
}

export function ColumnName({ seqName, sequence, ...restProps }: ColumnNameProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const id = getSafeId('sequence-label', { seqName })

  return (
    <td
      id={id}
      className="results-table-col results-table-col-label"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      {...restProps}
    >
      {seqName}
      {sequence && <ColumnNameTooltip showTooltip={showTooltip} sequence={sequence} />}
    </td>
  )
}
