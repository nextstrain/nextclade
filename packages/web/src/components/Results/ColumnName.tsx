import React, { useState } from 'react'

import type { AnalysisResult } from 'src/algorithms/types'

import { getSafeId } from 'src/helpers/getSafeId'
import { ColumnNameTooltip } from 'src/components/Results/ColumnNameTooltip'

export interface ColumnNameProps {
  seqName: string
  sequence?: AnalysisResult
}

export function ColumnName({ seqName, sequence }: ColumnNameProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const id = getSafeId('sequence-label', { seqName })

  return (
    <div id={id} className="w-100" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
      {seqName}
      {sequence && <ColumnNameTooltip showTooltip={showTooltip} sequence={sequence} />}
    </div>
  )
}
