import React, { useState } from 'react'
import { getSafeId } from 'src/helpers/getSafeId'

import type { AnalysisResult } from 'src/algorithms/types'
import { Tooltip } from 'src/components/Results/Tooltip'
import { ListOfMissing } from 'src/components/Results/ListOfMissing'

export interface ColumnMissingProps {
  analysisResult: AnalysisResult
}

export function ColumnMissing({ analysisResult }: ColumnMissingProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const { missing, seqName, totalMissing } = analysisResult
  const id = getSafeId('col-missing', { seqName })

  return (
    <div id={id} className="w-100" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
      {totalMissing}
      <Tooltip isOpen={showTooltip} target={id}>
        <ListOfMissing missing={missing} totalMissing={totalMissing} />
      </Tooltip>
    </div>
  )
}
